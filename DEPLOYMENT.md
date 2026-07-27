# Production deployment on Oracle Cloud

This deployment keeps the application stateless. WhatsApp ZIP files are opened
by JavaScript in the visitor's browser and are not sent to the application
container. The application has no upload route and no conversation volume.

## Architecture

- Caddy is the only public container and listens on ports 80 and 443.
- The application listens only on an internal Docker network.
- The metrics service stores only daily aggregate counters in a named volume.
- Its dashboard listens only on `127.0.0.1:9180` on the server.
- Portainer listens only on `127.0.0.1:9443` on the server.
- Caddy obtains and renews the public TLS certificate automatically.
- Portainer, Caddy, and aggregate metrics state are kept in named Docker
  volumes; the application is read-only and has no persistent conversation
  data.

## 1. Oracle Cloud instance

Recommended starting point:

- Ubuntu 24.04 LTS
- Ampere A1 Flex (`arm64`) or an AMD shape (`amd64`)
- 1 OCPU and 6 GB RAM for this site, or 2 OCPUs and 12 GB for extra headroom
- 50 GB boot volume
- Reserved public IPv4 address

Create an NSG or security list with only these ingress rules:

| Source | Protocol | Port | Purpose |
| --- | --- | --- | --- |
| Your current public IP `/32` | TCP | 22 | SSH administration |
| `0.0.0.0/0` | TCP | 80 | HTTP and certificate validation |
| `0.0.0.0/0` | TCP | 443 | HTTPS |
| `0.0.0.0/0` | UDP | 443 | HTTP/3 (optional) |

Do not expose ports 3000, 8000, 9000, 9180, or 9443 in Oracle Cloud.

## 2. Public address

The production hostname is proxied by Cloudflare and points to the reserved
Oracle Cloud public IP:

```text
SITE_ADDRESS=whatsapp-viewer.runcode.qzz.io
```

Caddy obtains and renews the origin certificate automatically. Cloudflare must
use `Full (strict)` SSL/TLS mode after the certificate is active. If IPv6 is
configured, create the matching `AAAA` record as well.

## 3. Install Docker

Clone this private repository on the server using an SSH deploy key, then run:

```bash
cd /opt/whatsapp-export-viewer
sudo bash deploy/bootstrap-ubuntu.sh
```

Sign out and back in so the Docker group membership is applied.

## 4. Start Portainer

```bash
cd /opt/whatsapp-export-viewer
docker compose -f deploy/portainer.compose.yml up -d
```

From the administrator's computer, open a tunnel (replace the values):

```bash
ssh -N -L 9443:127.0.0.1:9443 ubuntu@SERVER_IP
```

Then open `https://localhost:9443`. The first certificate warning is expected
because Portainer uses its own self-signed certificate. Create the administrator
account immediately. The tunnel must remain open while using the panel.

## 5. Open the private metrics dashboard

The dashboard shows visits, import attempts, successful imports, and errors. It
does not store IP addresses, user agents, filenames, URLs, chat contents, or
chat metadata.

From the administrator's computer:

```bash
ssh -N -L 9180:127.0.0.1:9180 ubuntu@SERVER_IP
```

Then open `http://localhost:9180`. The tunnel must remain open while using the
dashboard.

## 6. Start the site

```bash
cd /opt/whatsapp-export-viewer
cp .env.example .env
nano .env
docker compose up -d --build
docker compose ps
```

Keep `SITE_ADDRESS` set to the public hostname without `https://`.

For later versions, run the deployment helper from a clean, committed local
checkout:

```powershell
.\deploy\publish.ps1
```

Use `-Ref <commit-or-tag>` to publish or restore a specific committed version.

## 7. Update and roll back

Update:

```bash
cd /opt/whatsapp-export-viewer
git pull --ff-only
docker compose build --pull
docker compose up -d
docker image prune -f
```

Before updating, note the current commit with `git rev-parse HEAD`. To roll back,
switch to that known commit and run `docker compose up -d --build` again.

## 8. Verification

```bash
docker compose ps
docker compose logs --tail=100 app metrics caddy
curl -I https://YOUR_DOMAIN
ss -lntup
```

The public listener list must not contain ports 3000, 8000, 9000, 9180, or
9443.
Import a disposable test ZIP in the browser, then confirm the browser network
panel contains no request with that ZIP or its message contents. The only
application-owned metrics requests are empty POSTs to fixed `/__metrics/*`
paths.
