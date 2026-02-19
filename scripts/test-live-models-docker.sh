#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IMAGE_NAME="${WOODLS_IMAGE:-${WOODLS_IMAGE:-woodls:local}}"
CONFIG_DIR="${WOODLS_CONFIG_DIR:-${WOODLS_CONFIG_DIR:-$HOME/.woodls}}"
WORKSPACE_DIR="${WOODLS_WORKSPACE_DIR:-${WOODLS_WORKSPACE_DIR:-$HOME/.woodls/workspace}}"
PROFILE_FILE="${WOODLS_PROFILE_FILE:-${WOODLS_PROFILE_FILE:-$HOME/.profile}}"

PROFILE_MOUNT=()
if [[ -f "$PROFILE_FILE" ]]; then
  PROFILE_MOUNT=(-v "$PROFILE_FILE":/home/node/.profile:ro)
fi

echo "==> Build image: $IMAGE_NAME"
docker build -t "$IMAGE_NAME" -f "$ROOT_DIR/Dockerfile" "$ROOT_DIR"

echo "==> Run live model tests (profile keys)"
docker run --rm -t \
  --entrypoint bash \
  -e COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
  -e HOME=/home/node \
  -e NODE_OPTIONS=--disable-warning=ExperimentalWarning \
  -e WOODLS_LIVE_TEST=1 \
  -e WOODLS_LIVE_MODELS="${WOODLS_LIVE_MODELS:-${WOODLS_LIVE_MODELS:-all}}" \
  -e WOODLS_LIVE_PROVIDERS="${WOODLS_LIVE_PROVIDERS:-${WOODLS_LIVE_PROVIDERS:-}}" \
  -e WOODLS_LIVE_MODEL_TIMEOUT_MS="${WOODLS_LIVE_MODEL_TIMEOUT_MS:-${WOODLS_LIVE_MODEL_TIMEOUT_MS:-}}" \
  -e WOODLS_LIVE_REQUIRE_PROFILE_KEYS="${WOODLS_LIVE_REQUIRE_PROFILE_KEYS:-${WOODLS_LIVE_REQUIRE_PROFILE_KEYS:-}}" \
  -v "$CONFIG_DIR":/home/node/.woodls \
  -v "$WORKSPACE_DIR":/home/node/.woodls/workspace \
  "${PROFILE_MOUNT[@]}" \
  "$IMAGE_NAME" \
  -lc "set -euo pipefail; [ -f \"$HOME/.profile\" ] && source \"$HOME/.profile\" || true; cd /app && pnpm test:live"
