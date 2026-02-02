#!/bin/bash
# Test script to verify staging and production Docker builds locally
# This script is for testing purposes only and is not part of the deployment process
#
# USAGE: Run from the project root directory:
#   ./tools/test-docker-builds.sh

set -e

# Helper for smoke testing a built image
smoke_test() {
  local image=$1
  local port=$2
  local container_id=""

  echo "Starting smoke test for $image on port $port..."
  container_id=$(docker run -d --rm -p "$port:8080" "$image")

  # Ensure cleanup on failure
  trap "docker stop $container_id >/dev/null 2>&1 || true" ERR

  echo "Waiting for $image to be ready..."
  local count=0
  local max=10
  while ! curl -fsS "http://localhost:$port/health" >/dev/null 2>&1; do
    if [ $count -ge $max ]; then
      echo "FAILED: $image did not become ready within $max seconds."
      docker logs "$container_id"
      docker stop "$container_id" >/dev/null 2>&1 || true
      return 1
    fi
    sleep 1
    count=$((count + 1))
  done

  echo "SUCCESS: $image is healthy."
  docker stop "$container_id" >/dev/null 2>&1 || true
  trap - ERR
}

# Ensure we're in the project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Testing Staging Build ==="
docker build \
  --build-arg VITE_MODE=staging \
  --build-arg VITE_SHOW_DEV_FORMPACKS=true \
  --build-arg VITE_DEPLOYMENT_ENV=staging \
  -t mecfs-paperwork:test-staging \
  .

smoke_test "mecfs-paperwork:test-staging" 8081

echo ""
echo "=== Testing Production Build ==="
docker build \
  --build-arg VITE_MODE=production \
  --build-arg VITE_SHOW_DEV_FORMPACKS= \
  --build-arg VITE_DEPLOYMENT_ENV=production \
  -t mecfs-paperwork:test-prod \
  .

smoke_test "mecfs-paperwork:test-prod" 8082

echo ""
echo "=== Build Tests Completed Successfully ==="
echo "Staging image: mecfs-paperwork:test-staging"
echo "Production image: mecfs-paperwork:test-prod"
echo ""
echo "To test the images locally, run:"
echo "  docker run -p 8080:8080 mecfs-paperwork:test-staging"
echo "  docker run -p 8080:8080 mecfs-paperwork:test-prod"
