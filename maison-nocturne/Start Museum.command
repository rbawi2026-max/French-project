#!/bin/sh
cd "$(dirname "$0")" || exit 1
COUTURE_NODE="$(command -v node || true)"
if [ -z "$COUTURE_NODE" ]; then
  COUTURE_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$COUTURE_NODE" ]; then
  echo 'Node.js is needed on this computer. Install Node.js 24, then open this launcher again.'
  printf 'Press Return to close. '
  read COUTURE_REPLY
  exit 1
fi
"$COUTURE_NODE" serve.mjs --open
COUTURE_RESULT=$?
if [ "$COUTURE_RESULT" -ne 0 ]; then
  printf 'Press Return to close. '
  read COUTURE_REPLY
fi
