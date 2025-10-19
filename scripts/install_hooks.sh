#!/bin/bash
# Install git hooks for exercAIse
# Run this once after cloning the repository

cd "$(dirname "$0")/.." || exit 1

echo "Installing git hooks..."

# Install pre-commit hook
if [ -f .git/hooks/pre-commit ]; then
  echo "Warning: pre-commit hook already exists"
  read -p "Overwrite? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping pre-commit hook"
  else
    ln -sf ../../scripts/hooks/pre-commit .git/hooks/pre-commit
    echo "✓ Pre-commit hook installed"
  fi
else
  ln -s ../../scripts/hooks/pre-commit .git/hooks/pre-commit
  echo "✓ Pre-commit hook installed"
fi

echo ""
echo "Git hooks installed successfully!"
echo ""
echo "The pre-commit hook will automatically update workouts/manifest.txt"
echo "whenever you commit changes to workout JSON files."
