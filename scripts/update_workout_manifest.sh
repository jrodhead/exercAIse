#!/bin/bash
# Generate workout manifest
# Run this script whenever workout files are added or removed

cd "$(dirname "$0")/.." || exit 1

ls workouts/*.json | grep -v mock_All_Types_Test.json | sort -r > workouts/manifest.txt

echo "Workout manifest updated: workouts/manifest.txt"
echo "$(wc -l < workouts/manifest.txt | tr -d ' ') workout files listed"
