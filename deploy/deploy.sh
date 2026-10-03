#!/usr/bin/env bash
# Deploy FABULA ONE to the production VPS.
# Usage: ./deploy/deploy.sh user@host
set -euo pipefail

REMOTE="${1:?usage: ./deploy/deploy.sh user@host}"
APP_DIR="${APP_DIR:-/opt/fabulaone}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Syncing project to ${REMOTE}:${APP_DIR}"
ssh "$REMOTE" "mkdir -p ${APP_DIR}"
rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .git \
  --exclude media \
  --exclude 'public/media' \
  --exclude '.env' \
  "$ROOT_DIR/" "$REMOTE:${APP_DIR}/"

echo "→ Ensure .env exists on server"
ssh "$REMOTE" "test -f ${APP_DIR}/.env || { echo 'MISSING ${APP_DIR}/.env — upload secrets first'; exit 1; }"

echo "→ Building and starting stack"
ssh "$REMOTE" "cd ${APP_DIR} && docker compose pull redis postgres nginx || true"
ssh "$REMOTE" "cd ${APP_DIR} && docker compose up -d --build"

echo "→ Drop old Docker build cache (keeps the running image)"
ssh "$REMOTE" "docker builder prune -af --filter until=24h >/dev/null || true"

echo "→ Health check"
ssh "$REMOTE" "sleep 8 && curl -fsS http://127.0.0.1/api/health || true"

echo "✓ Deploy finished. Open https://fabulaone.ru and /admin"
