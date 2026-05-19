#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)
FILE=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE" ]]; then
  exit 0
fi

EXT="${FILE##*.}"

case "$EXT" in
  ts|tsx|js|jsx|mjs|cjs)
    # Format with Biome, then lint-fix with ESLint
    pnpm exec biome format --write "$FILE" 2>/dev/null || true
    pnpm exec eslint --fix "$FILE" 2>/dev/null || true
    ;;
  json)
    pnpm exec biome format --write "$FILE" 2>/dev/null || true
    ;;
esac

exit 0
