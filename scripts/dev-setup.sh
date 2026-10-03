#!/bin/sh
# Install and compile the isolated package; never start integrations.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
command -v bun >/dev/null 2>&1 || { echo "Install the Bun version specified by packages/runtime/package.json." >&2; exit 1; }
bun --no-env-file install --cwd packages/runtime --frozen-lockfile --ignore-scripts
bun --no-env-file run --cwd packages/runtime typecheck
bun --no-env-file run --cwd packages/runtime build
printf '%s\n' 'Build ready. Start explicitly: bun --no-env-file packages/runtime/src/cli.ts chat'
