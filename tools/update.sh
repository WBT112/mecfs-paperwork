#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   sudo ./update-mecfs-paperwork.sh [REPO_DIR]
#
# Example:
#   sudo ./update-mecfs-paperwork.sh /root/apps/mecfs-paperwork
#   sudo ./update-mecfs-paperwork.sh /home/<user>/apps/mecfs-paperwork

REPO_DIR="${1:-/apps/mecfs-paperwork}"
BRANCH="${BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.prod.yaml}"

log() { printf "\n==> %s\n" "$*"; }

need_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "ERROR: Please run as root (or via sudo)." >&2
    exit 1
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: Required command not found: $1" >&2
    exit 1
  }
}

need_root
require_cmd git
require_cmd apt-get
require_cmd docker

# Validate repo via git (works for normal repos AND worktrees)
if ! git -C "$REPO_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: '$REPO_DIR' is not a git working tree (or not accessible)." >&2
  echo "Tip: call script with the correct repo path, e.g.:" >&2
  echo "  sudo $0 /root/apps/mecfs-paperwork" >&2
  echo "  sudo $0 /home/<user>/apps/mecfs-paperwork" >&2
  exit 1
fi

# Resolve actual repo root (handles being inside subdirectories)
REPO_ROOT="$(git -C "$REPO_DIR" rev-parse --show-toplevel)"
log "Repo root: $REPO_ROOT"

log "Hard update repo -> origin/$BRANCH"
cd "$REPO_ROOT"
git fetch --prune origin
git reset --hard "origin/$BRANCH"
git clean -fd

log "OS updates (non-interactive)"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y dist-upgrade
apt-get -y autoremove --purge

log "Docker Compose rebuild + restart"
if [[ ! -f "$REPO_ROOT/$COMPOSE_FILE" ]]; then
  echo "ERROR: Compose file not found: $REPO_ROOT/$COMPOSE_FILE" >&2
  exit 1
fi

cd "$REPO_ROOT"
docker compose -f "$COMPOSE_FILE" build --pull web
docker compose -f "$COMPOSE_FILE" up -d --force-recreate

log "Status"
docker compose -f "$COMPOSE_FILE" ps

log "Done."
