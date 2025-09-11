#!/bin/bash
# Install git hooks locally (pre-commit).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
mkdir -p .git/hooks
cp -f scripts/git-hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "Installed pre-commit hook. It will run Validate + Lint before each commit."
