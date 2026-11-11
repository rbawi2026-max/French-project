#!/bin/sh
set -eu
cd "$(dirname "$0")"
COUTURE_NODE="$(command -v node || true)"
if [ -z "$COUTURE_NODE" ]; then
  COUTURE_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$COUTURE_NODE" ]; then
  echo 'Install Node.js 24, install dependencies, and run npm run dev.' >&2
  exit 1
fi
exec "$COUTURE_NODE" node_modules/vite/bin/vite.js --host 127.0.0.1 "$@"
