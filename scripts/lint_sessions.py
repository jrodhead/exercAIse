#!/usr/bin/env python3
"""
Lint workout session JSON files for required fields used by the app UI.

Checks (warnings by default; can be strict):
 - Each exercise item has `link` and `logType` (allowed: strength|endurance|carry|mobility|stretch)
 - Links look like exercises/<slug>.json and the file exists
 - For circuits/supersets, validate children recursively

Usage:
  python3 scripts/lint_sessions.py --glob 'workouts/3-1_*.json' --strict
  python3 scripts/lint_sessions.py                 # scans workouts/**/*.json (warn-only)
"""
import argparse
import glob
import json
import os
import sys
from typing import Any, Dict, List

ALLOWED_LOG_TYPES = {"strength", "endurance", "carry", "mobility", "stretch"}


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def is_exercise_item(item: Dict[str, Any]) -> bool:
    return isinstance(item, dict) and item.get("kind") == "exercise"


def iter_items(item: Dict[str, Any]):
    # Yield this item and recurse into children if circuit/superset
    if not isinstance(item, dict):
        return
    yield item
    if item.get("kind") in ("circuit", "superset"):
        for ch in item.get("children", []) or []:
            for sub in iter_items(ch):
                yield sub


def lint_file(path: str, repo_root: str) -> List[str]:
    rel = os.path.relpath(path, repo_root)
    errors: List[str] = []
    try:
        data = load_json(path)
    except Exception as e:
        errors.append(f"{rel}: Failed to parse JSON: {e}")
        return errors

    sections = data.get("sections") or []
    if not isinstance(sections, list):
        errors.append(f"{rel}: sections must be an array")
        return errors

    for si, sec in enumerate(sections):
        items = (sec or {}).get("items") or []
        for it in items:
            for node in iter_items(it):
                if is_exercise_item(node):
                    name = node.get("name", "<unnamed>")
                    link = node.get("link")
                    lt = node.get("logType")
                    if not link:
                        errors.append(f"{rel}: Missing link on '{name}'")
                    else:
                        if not isinstance(link, str) or not link.startswith("exercises/") or not link.endswith(".json"):
                            errors.append(f"{rel}: Suspicious link on '{name}': {link}")
                        else:
                            ex_path = os.path.join(repo_root, link)
                            if not os.path.exists(ex_path):
                                errors.append(f"{rel}: Exercise JSON not found for '{name}': {link}")
                    if not lt:
                        errors.append(f"{rel}: Missing logType on '{name}'")
                    elif lt not in ALLOWED_LOG_TYPES:
                        errors.append(f"{rel}: Invalid logType '{lt}' on '{name}'")
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--glob", default="workouts/**/*.json", help="Glob for session JSON files")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero if any errors found")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pattern = os.path.join(repo_root, args.glob)
    files = sorted(glob.glob(pattern, recursive=True))
    if not files:
        print(f"No files matched: {args.glob}")
        return 0

    total = 0
    total_errs = 0
    for fp in files:
        total += 1
        errs = lint_file(fp, repo_root)
        if errs:
            total_errs += len(errs)
            for e in errs:
                print("ERROR:", e)

    print(f"Scanned {total} file(s); errors: {total_errs}")
    if args.strict and total_errs:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
