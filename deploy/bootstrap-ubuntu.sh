#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script with sudo: sudo bash deploy/bootstrap-ubuntu.sh" >&2
  exit 1
fi

source /etc/os-release
if [[ ${ID:-} != "ubuntu" ]]; then
  echo "This bootstrap supports Ubuntu only." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y ca-certificates curl git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

systemctl enable --now docker

ADMIN_USER=${SUDO_USER:-ubuntu}
if id "$ADMIN_USER" >/dev/null 2>&1; then
  usermod -aG docker "$ADMIN_USER"
fi

install -d -m 0755 -o "$ADMIN_USER" -g "$ADMIN_USER" /opt/whatsapp-export-viewer

docker version
docker compose version

echo
echo "Docker is ready. Sign out and back in before using Docker without sudo."
