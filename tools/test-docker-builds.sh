#!/bin/bash
# Test script to verify staging and production Docker builds locally
# This script is for testing purposes only and is not part of the deployment process
#
# USAGE: Run from the project root directory:
#   ./tools/test-docker-builds.sh

set -e

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

echo ""
echo "=== Testing Production Build ==="
docker build \
  --build-arg VITE_MODE=production \
  --build-arg VITE_SHOW_DEV_FORMPACKS= \
  --build-arg VITE_DEPLOYMENT_ENV=production \
  -t mecfs-paperwork:test-prod \
  .

echo ""
echo "=== Build Tests Completed Successfully ==="
echo "Staging image: mecfs-paperwork:test-staging"
echo "Production image: mecfs-paperwork:test-prod"
echo ""
echo "To test the images locally, run:"
echo "  docker run -p 8080:8080 mecfs-paperwork:test-staging"
echo "  docker run -p 8080:8080 mecfs-paperwork:test-prod"
