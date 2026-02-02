# OpsReady Journal

## 2025-05-22 - Host-side Smoke Testing for Minimal Images

**Learning:** When using minimal or distroless base images (like NGINX without shell/wget/curl), internal Docker `healthcheck` instructions are not feasible as they lack a binary to execute the test. In these cases, service readiness should be verified from the host or CI runner.

**Action:** Implement host-side smoke tests that start the container and poll a `/health` endpoint using host-side tools like `curl`. Update `tools/test-docker-builds.sh` to automate this verification during local/CI builds.
