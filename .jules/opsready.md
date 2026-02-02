# OpsReady Journal

## 2025-05-22 - Improved Service Readiness with Healthchecks

**Learning:** Services in Docker Compose should have explicit healthchecks to ensure proper startup ordering and reliable readiness reporting. Using a dedicated `/health` endpoint in NGINX is a lightweight and reliable way to implement this.

**Action:** Always include a `/health` endpoint in NGINX configs and use it for `healthcheck` in Compose files, combined with `depends_on: { condition: service_healthy }` for downstream services like Caddy.
