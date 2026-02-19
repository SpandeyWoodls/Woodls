#!/usr/bin/env bash
set -euo pipefail

cd /repo

export WOODLS_STATE_DIR="/tmp/woodls-test"
export WOODLS_CONFIG_PATH="${WOODLS_STATE_DIR}/woodls.json"

echo "==> Build"
pnpm build

echo "==> Seed state"
mkdir -p "${WOODLS_STATE_DIR}/credentials"
mkdir -p "${WOODLS_STATE_DIR}/agents/main/sessions"
echo '{}' >"${WOODLS_CONFIG_PATH}"
echo 'creds' >"${WOODLS_STATE_DIR}/credentials/marker.txt"
echo 'session' >"${WOODLS_STATE_DIR}/agents/main/sessions/sessions.json"

echo "==> Reset (config+creds+sessions)"
pnpm woodls reset --scope config+creds+sessions --yes --non-interactive

test ! -f "${WOODLS_CONFIG_PATH}"
test ! -d "${WOODLS_STATE_DIR}/credentials"
test ! -d "${WOODLS_STATE_DIR}/agents/main/sessions"

echo "==> Recreate minimal config"
mkdir -p "${WOODLS_STATE_DIR}/credentials"
echo '{}' >"${WOODLS_CONFIG_PATH}"

echo "==> Uninstall (state only)"
pnpm woodls uninstall --state --yes --non-interactive

test ! -d "${WOODLS_STATE_DIR}"

echo "OK"
