# Deployment Guide

This document explains how the production and staging environments are deployed and managed.

## Overview

The mecfs-paperwork application has two deployment environments:

- **Production**: `mecfs-paperwork.de` (and `www.mecfs-paperwork.de`)
- **Staging**: `staging.mecfs-paperwork.de`

Both environments run on the same server using Docker Compose with separate containers for each environment.

## Environment Differences

### Production (`main` branch)
- **Domain**: `mecfs-paperwork.de`, `www.mecfs-paperwork.de`
- **Docker Image**: `wbt112/mecfs-paperwork:prod`
- **Build Mode**: `production`
- **Dev Formpacks**: Hidden (`VITE_SHOW_DEV_FORMPACKS` not set)
- **Environment Marker**: None (production default)

### Staging (`staging` branch)
- **Domain**: `staging.mecfs-paperwork.de`
- **Docker Image**: `wbt112/mecfs-paperwork:staging`
- **Build Mode**: `staging`
- **Dev Formpacks**: Visible (`VITE_SHOW_DEV_FORMPACKS=true`)
- **Environment Marker**: Orange "STAGING" banner in top-right corner
- **SEO**: Not indexed by search engines (`X-Robots-Tag: noindex, nofollow`)

## Docker Images

Images are hosted on Docker Hub at `wbt112/mecfs-paperwork`.

### Tags

Each deployment creates two tags:

1. **Environment tag**: Always points to the latest deployment
   - `prod` - Latest production build
   - `staging` - Latest staging build

2. **SHA tag**: Immutable tag for specific commit
   - `prod-<short-sha>` - Production build from specific commit
   - `staging-<short-sha>` - Staging build from specific commit

**Example:**
- After deploying commit `abc1234` to staging:
  - `staging` → `staging-abc1234`
  - `staging-abc1234` (immutable)

## Deployment Process

### Automatic Deployment

Deployments are triggered automatically via GitHub Actions when pushing to tracked branches:

1. **Push to `main`**:
   - Builds production image with `VITE_SHOW_DEV_FORMPACKS` unset
   - Pushes to Docker Hub as `prod` and `prod-<sha>`
   - SSH into server
   - Pulls latest `prod` image
   - Restarts production container

2. **Push to `staging`**:
   - Builds staging image with `VITE_SHOW_DEV_FORMPACKS=true`
   - Pushes to Docker Hub as `staging` and `staging-<sha>`
   - SSH into server
   - Pulls latest `staging` image
   - Restarts staging container

### Manual Deployment

If needed, you can deploy manually:

```bash
# On the deployment server
cd /opt/mecfs-paperwork

# Login to Docker Hub (use your own credentials)
docker login -u YOUR_DOCKERHUB_USERNAME

# Pull latest images
docker compose -f compose.deploy.yaml pull

# Restart services
docker compose -f compose.deploy.yaml up -d
```

Note: For automated deployments, the CI/CD pipeline passes Docker Hub credentials via SSH environment variables.

## Infrastructure Setup

### Server Requirements

- Docker and Docker Compose installed
- Ports 80 and 443 available for Caddy reverse proxy
- DNS records configured:
  - `mecfs-paperwork.de` → server IP
  - `www.mecfs-paperwork.de` → server IP
  - `staging.mecfs-paperwork.de` → server IP

### Directory Structure

```
/opt/mecfs-paperwork/
├── compose.deploy.yaml
├── Caddyfile
└── (Docker volumes managed by Compose)
```

### GitHub Secrets

The following secrets must be configured in the GitHub repository:

- `DOCKERHUB_USERNAME` - Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token
- `DEPLOY_SSH_KEY` - Private SSH key for deployment server access
- `DEPLOY_HOST` - Deployment server hostname/IP
- `DEPLOY_USER` - SSH user for deployment

## Rollback Procedure

If a deployment causes issues, you can rollback to a previous version using SHA tags.

### 1. Find the Previous Working Version

Check Docker Hub or git history to find the commit SHA of the last working version:

```bash
# List recent commits
git log --oneline -n 10 main  # for production
git log --oneline -n 10 staging  # for staging
```

### 2. Update Compose File to Use SHA Tag

Edit `compose.deploy.yaml` on the server to use a specific SHA tag:

```yaml
# For production rollback
web-prod:
  image: docker.io/wbt112/mecfs-paperwork:prod-abc1234  # Use specific SHA

# For staging rollback
web-staging:
  image: docker.io/wbt112/mecfs-paperwork:staging-xyz5678  # Use specific SHA
```

### 3. Deploy the Previous Version

```bash
cd /opt/mecfs-paperwork
docker compose -f compose.deploy.yaml pull
docker compose -f compose.deploy.yaml up -d
```

### 4. Verify the Rollback

Check the application is working correctly:

```bash
# Check production
curl -I https://mecfs-paperwork.de

# Check staging
curl -I https://staging.mecfs-paperwork.de
```

### 5. Fix Forward (Recommended)

After verifying the rollback:
1. Fix the issue in your code
2. Push the fix to `main` or `staging`
3. The CI/CD pipeline will automatically deploy the fix

## Build Arguments

The Dockerfile accepts the following build arguments:

- `VITE_MODE` (default: `production`)
  - Controls which `.env.*` file Vite loads
  - Values: `production`, `staging`

- `VITE_SHOW_DEV_FORMPACKS` (default: empty)
  - When set to `true`, shows formpacks with `"visibility": "dev"`
  - Production builds should leave this empty

- `VITE_DEPLOYMENT_ENV` (default: empty)
  - Marks which environment the build is for
  - Values: `production`, `staging`
  - Staging shows a visible "STAGING" banner

### Local Testing

To test the staging build locally:

```bash
# Build staging image
docker build \
  --build-arg VITE_MODE=staging \
  --build-arg VITE_SHOW_DEV_FORMPACKS=true \
  --build-arg VITE_DEPLOYMENT_ENV=staging \
  -t mecfs-paperwork:staging-local \
  .

# Run staging image
docker run -p 8080:8080 mecfs-paperwork:staging-local
```

To test the production build locally:

```bash
# Build production image (default args)
docker build -t mecfs-paperwork:prod-local .

# Run production image
docker run -p 8080:8080 mecfs-paperwork:prod-local
```

## Network Configuration

The deployment uses a Docker bridge network to isolate containers:

- **web-prod** and **web-staging** expose port 8080 internally (not bound to host)
- **caddy** reverse proxy is the only container with host port bindings (80, 443)
- Caddy routes traffic based on domain:
  - `mecfs-paperwork.de` → `web-prod:8080`
  - `www.mecfs-paperwork.de` → `web-prod:8080`
  - `staging.mecfs-paperwork.de` → `web-staging:8080`

This avoids port conflicts and improves security by not exposing application ports directly.

## Security Considerations

### Container Hardening

Both production and staging containers use the same security settings:
- Read-only root filesystem
- No new privileges
- Minimal capabilities (only `NET_BIND_SERVICE`)
- Unprivileged user (uid 65532)
- Resource limits via Docker

### TLS/HTTPS

Caddy automatically manages Let's Encrypt certificates for all domains.

### Staging Environment

The staging environment has additional protections:
- `X-Robots-Tag: noindex, nofollow` header prevents search engine indexing
- Visible "STAGING" banner helps prevent confusion with production
- Same security hardening as production

## Monitoring

### Container Health

Check container status:

```bash
docker compose -f /opt/mecfs-paperwork/compose.deploy.yaml ps
docker compose -f /opt/mecfs-paperwork/compose.deploy.yaml logs -f
```

### Caddy Health Check

The Caddy container has a health check that verifies:
1. Caddy is running (`caddy version`)
2. Production app is reachable (`http://web-prod:8080/`)
3. Staging app is reachable (`http://web-staging:8080/`)

Check health status:

```bash
docker inspect --format='{{.State.Health.Status}}' mecfs-caddy
```

## Troubleshooting

### Deployment Fails to Pull Image

**Issue**: `docker compose pull` fails

**Solution**:
1. Verify Docker Hub credentials are correct
2. Check network connectivity: `curl -I https://hub.docker.com`
3. Try logging in manually: `docker login`

### Container Won't Start

**Issue**: Container immediately exits or restarts

**Solution**:
1. Check logs: `docker compose -f compose.deploy.yaml logs web-prod`
2. Verify build completed successfully in GitHub Actions
3. Test the image locally: `docker run -it --rm wbt112/mecfs-paperwork:prod sh`

### Wrong Environment Variables

**Issue**: Staging not showing dev formpacks, or production showing them

**Solution**:
1. Check the Docker image build args in GitHub Actions logs
2. Verify the correct image tag is being used in `compose.deploy.yaml`
3. Rebuild and redeploy: trigger a new commit to the appropriate branch

### Port Conflicts

**Issue**: "Port already in use" errors

**Solution**:
1. Ensure no other services are binding to ports 80 or 443
2. Check Caddy is the only service with `ports:` (not `expose:`)
3. Verify app containers use `expose:` only

## Maintenance

### Cleaning Up Old Images

The deploy workflow automatically prunes images older than 7 days (168 hours).

To manually clean up:

```bash
# Remove dangling images
docker image prune -f

# Remove images older than 7 days
docker image prune -af --filter "until=168h"
```

### Updating Dependencies

1. Update dependencies in `package.json` or `Dockerfile`
2. Test locally
3. Commit and push to `staging` branch
4. Verify on `staging.mecfs-paperwork.de`
5. Merge to `main` and verify on `mecfs-paperwork.de`

## Support

For deployment issues:
1. Check GitHub Actions logs for build failures
2. Check server logs: `docker compose -f compose.deploy.yaml logs`
3. Verify DNS records and server accessibility
4. Consult this guide's troubleshooting section
