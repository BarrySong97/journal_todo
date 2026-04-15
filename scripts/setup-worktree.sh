#!/bin/bash
set -euo pipefail

ROOT_PATH="${CONDUCTOR_ROOT_PATH:-}"

if [ -z "$ROOT_PATH" ]; then
  echo "CONDUCTOR_ROOT_PATH is not set; skipping shared file linking."
  exit 0
fi

link_shared_file() {
  local mapping="$1"
  local source_relative_path="$mapping"
  local target_relative_path="$mapping"

  if [[ "$mapping" == *":"* ]]; then
    source_relative_path="${mapping%%:*}"
    target_relative_path="${mapping##*:}"
  fi

  local source_path="$ROOT_PATH/$source_relative_path"
  local target_path="$PWD/$target_relative_path"

  if [ ! -f "$source_path" ]; then
    echo "Skipping $target_relative_path (missing in root repo)"
    return
  fi

  mkdir -p "$(dirname "$target_path")"

  if [ -L "$target_path" ] && [ "$(readlink "$target_path")" = "$source_path" ]; then
    echo "Already linked $target_relative_path"
    return
  fi

  if [ -e "$target_path" ] || [ -L "$target_path" ]; then
    echo "Keeping existing $target_relative_path"
    return
  fi

  ln -s "$source_path" "$target_path"
  echo "Linked $target_relative_path"
}

for mapping in \
  packages/web/.env.local \
  packages/website/.env.local \
  journal_todo.key \
  packages/web/.env.local:packages/desktop/.env
do
  link_shared_file "$mapping"
done
