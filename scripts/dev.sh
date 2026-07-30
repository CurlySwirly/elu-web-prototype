#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Raise FD limit in this shell (macOS default soft limit is often 256)
ulimit -n 65536 2>/dev/null || ulimit -n 10240 2>/dev/null || true

export WATCHPACK_POLLING=true
export CHOKIDAR_USEPOLLING=true
export NEXT_TELEMETRY_DISABLED=1

echo "ulimit -n = $(ulimit -n)"
echo "Starting Next.js on http://127.0.0.1:3000 ..."
exec npm run dev -- -H 127.0.0.1 -p 3000
