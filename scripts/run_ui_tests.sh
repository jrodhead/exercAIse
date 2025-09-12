#!/usr/bin/env bash
set -euo pipefail

PORT=${PORT:-8000}
echo "Starting static server on port ${PORT}..." >&2
python3 -m http.server "${PORT}" >/dev/null 2>&1 &
SERVER_PID=$!
cleanup() {
  if kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" || true
  fi
}
trap cleanup EXIT INT TERM

export PLAYWRIGHT_BASE_URL="http://localhost:${PORT}"
echo "Running Playwright tests with baseURL=${PLAYWRIGHT_BASE_URL}" >&2

npx playwright test "$@"
