# Deployment / Compose files

This bundle contains:
- compose.deploy.yaml: Server runtime (pulls `wbt112/mecfs-paperwork:prod` + `:staging`, Caddy on 80/443)
- compose.yaml: Local/CI friendly (HTTP on localhost:8080, no TLS, local build)
- compose.prod.yaml: Production topology for local builds (Caddy handles TLS on 80/443 and reverse-proxies to the hardened NGINX app)
- compose.local-proxy.yaml: Production topology without SSL handling (pair with compose.prod.yaml)
- Caddyfile: Production + staging Caddy config (replace domain)
- Caddyfile.local + compose.local-proxy.yaml: Optional HTTP-only proxy for running the prod topology locally without TLS

Server runtime command (manual):
  docker login docker.io   # only if needed
  COMPOSE_PROJECT_NAME=mecfs-paperwork docker compose -f compose.deploy.yaml pull
  COMPOSE_PROJECT_NAME=mecfs-paperwork docker compose -f compose.deploy.yaml up -d

Notes:
- The deploy stack pins its network name to `mecfs-paperwork_web`. Keep a single Compose project
  name so Caddy and the app stay on the same network (avoids 502s).
- The NGINX base image writes its PID to `/run/nginx/nginx.pid`. The compose files mount
  `/run/nginx` as tmpfs so it remains writable with `read_only: true`. If you change tmpfs
  settings, recreate the containers.

Local/CI command:
  docker compose -f compose.yaml up -d --build

Local/CI command for production topology (no SSL):
  docker compose -f compose.prod.yaml -f compose.local-proxy.yaml up -d --build
