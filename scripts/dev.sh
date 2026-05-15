#!/bin/bash
set -euo pipefail

if [ -n "${CONDUCTOR_PORT:-}" ]; then
  WEB_PORT="$CONDUCTOR_PORT"
  WEB_HMR_PORT="$((CONDUCTOR_PORT + 1))"
  PORT_MODE="conductor"
elif [ -n "${1:-}" ]; then
  OFFSET="$1"
  WEB_PORT="$((1420 + OFFSET))"
  WEB_HMR_PORT="$((WEB_PORT + 1))"
  PORT_MODE="explicit-offset"
else
  DIR_NAME="$(basename "$PWD")"
  OFFSET="$(( $(echo -n "$DIR_NAME" | cksum | awk '{print $1}') % 99 + 1 ))"
  WEB_PORT="$((1420 + OFFSET))"
  WEB_HMR_PORT="$((WEB_PORT + 1))"
  PORT_MODE="hashed-offset"
fi

export WEB_PORT
export WEB_HMR_PORT

echo "================================================"
echo "  Starting workspace dev ($PORT_MODE)"
echo "================================================"
echo "  desktop:  tauri dev"
echo "  web:      http://localhost:$WEB_PORT"
echo "  hmr:      ws://localhost:$WEB_HMR_PORT"
echo "================================================"

if [ "${TURBO_DEV_DRY_RUN:-0}" = "1" ]; then
  exit 0
fi

TAURI_CONFIG_OVERRIDE="$(printf '{"build":{"devUrl":"http://127.0.0.1:%s","beforeDevCommand":"pnpm --filter @journal-todo/web dev"}}' "$WEB_PORT")"

exec pnpm --filter @journal-todo/desktop exec tauri dev --config "$TAURI_CONFIG_OVERRIDE"
