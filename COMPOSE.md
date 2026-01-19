# Deployment / Compose files

This bundle contains:
- compose.yaml: Local/CI friendly (HTTP on localhost:8080, no TLS)
- compose.prod.yaml: Production topology (Caddy handles TLS on 80/443 and reverse-proxies to the hardened NGINX app)
- compose.local-proxy.yaml: Production topology without SSL handling
- Caddyfile: Production Caddy config (replace domain)
- Caddyfile.local + compose.local-proxy.yaml: Optional HTTP-only proxy for running the prod topology locally without TLS

Production command (server):
  docker login dhi.io   # only if needed
  docker compose -f compose.prod.yaml up -d --build

Local/CI command:
  docker compose -f compose.yaml up -d --build

Local/CI command for production topology (no SSL):
docker compose -f compose.prod.yaml -f compose.local-proxy.yaml up -d --build
