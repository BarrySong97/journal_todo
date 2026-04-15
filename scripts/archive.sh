#!/usr/bin/env bash
# Archive script: remove all node_modules directories in the monorepo.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Removing all node_modules in $ROOT_DIR ..."

find "$ROOT_DIR" -name node_modules -type d -prune -exec rm -rf {} +

echo "Done. All node_modules removed."
