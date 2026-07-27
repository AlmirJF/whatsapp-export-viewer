#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: activate-release.sh RELEASE_DIR APP_ROOT SITE_ADDRESS COMMIT" >&2
  exit 2
fi

RELEASE_DIR=$1
APP_ROOT=$2
SITE_ADDRESS=$3
EXPECTED_COMMIT=$4

if [[ ! $RELEASE_DIR =~ ^/opt/whatsapp-export-viewer/releases/[0-9a-f]{12}$ ]]; then
  echo "Invalid release directory." >&2
  exit 2
fi

if [[ $APP_ROOT != "/opt/whatsapp-export-viewer" ]]; then
  echo "Invalid application root." >&2
  exit 2
fi

if [[ ! $EXPECTED_COMMIT =~ ^[0-9a-f]{40}$ ]]; then
  echo "Invalid commit identifier." >&2
  exit 2
fi

if [[ ! $SITE_ADDRESS =~ ^(https?://)?[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]]; then
  echo "Invalid site address." >&2
  exit 2
fi

if [[ ! -f $RELEASE_DIR/compose.yml || ! -f $RELEASE_DIR/Dockerfile ]]; then
  echo "The release archive is incomplete." >&2
  exit 2
fi

install -d -m 0755 "$APP_ROOT/shared"
if [[ $SITE_ADDRESS =~ ^https?:// ]]; then
  PUBLIC_ORIGIN=$SITE_ADDRESS
else
  PUBLIC_ORIGIN="https://$SITE_ADDRESS"
fi
printf 'SITE_ADDRESS=%s\nPUBLIC_ORIGIN=%s\n' "$SITE_ADDRESS" "$PUBLIC_ORIGIN" >"$APP_ROOT/shared/.env"
chmod 0600 "$APP_ROOT/shared/.env"

cd "$RELEASE_DIR"

docker compose --env-file "$APP_ROOT/shared/.env" config --quiet
docker compose --env-file "$APP_ROOT/shared/.env" build --pull app metrics
docker compose --env-file "$APP_ROOT/shared/.env" up -d --remove-orphans

for SERVICE in app metrics; do
  CONTAINER=$(docker compose --env-file "$APP_ROOT/shared/.env" ps -q "$SERVICE")
  if [[ -z $CONTAINER ]]; then
    echo "Container for $SERVICE was not created." >&2
    exit 1
  fi

  HEALTH=starting
  for _ in $(seq 1 60); do
    HEALTH=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER")
    if [[ $HEALTH == "healthy" ]]; then
      break
    fi
    if [[ $HEALTH == "unhealthy" ]]; then
      docker compose --env-file "$APP_ROOT/shared/.env" logs --tail=100 app metrics caddy
      exit 1
    fi
    sleep 1
  done

  if [[ $HEALTH != "healthy" ]]; then
    docker compose --env-file "$APP_ROOT/shared/.env" logs --tail=100 app metrics caddy
    echo "Health check for $SERVICE timed out." >&2
    exit 1
  fi
done

ln -sfn "$RELEASE_DIR" "$APP_ROOT/current.next"
mv -Tf "$APP_ROOT/current.next" "$APP_ROOT/current"
printf '%s\n' "$EXPECTED_COMMIT" >"$APP_ROOT/DEPLOYED_COMMIT"

docker compose --env-file "$APP_ROOT/shared/.env" ps

echo "Release ${EXPECTED_COMMIT} is active at ${SITE_ADDRESS}."
