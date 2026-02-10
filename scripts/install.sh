#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to install TOADSTOOL." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to install TOADSTOOL." >&2
  exit 1
fi

npm install -g toadstool-ts
echo "Installed toadstool. Run: toadstool"
