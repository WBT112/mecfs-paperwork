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
  docker compose -f compose.deploy.yaml pull
  docker compose -f compose.deploy.yaml up -d

Local/CI command:
  docker compose -f compose.yaml up -d --build

Local/CI command for production topology (no SSL):
  docker compose -f compose.prod.yaml -f compose.local-proxy.yaml up -d --build
