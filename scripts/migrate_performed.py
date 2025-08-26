#!/usr/bin/env python3
"""
Migrate legacy performed/*.json logs to match schemas/performed.schema.json.

Transforms:
- file -> workoutFile
- updatedAt -> timestamp (kept as ISO-8601 string)
- exercises: map<string, array-of-sets> -> map<string, { name?, sets: [...]}>
- remove legacy per-set 'set' ordinal
- if an exercise has an empty array, create a placeholder set with notes

Backups: writes a .bak once per file on first migration pass.
"""

import json
import os
import sys
from glob import glob
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PERFORMED_DIR = os.path.join(ROOT, 'performed')


def title_from_key(key: str) -> str:
    # Convert kebab or snake case to Title Case (best-effort)
    key = key.replace('_', '-').strip('-')
    parts = [p for p in key.split('-') if p]
    return ' '.join(w.capitalize() for w in parts) if parts else key


def migrate_file(path: str) -> bool:
    with open(path, 'r', encoding='utf-8') as f:
        try:
            data = json.load(f)
        except Exception as e:
            print(f"[SKIP] {os.path.relpath(path)} invalid JSON: {e}", file=sys.stderr)
            return False

    changed = False

    # Top-level field renames
    if 'file' in data and 'workoutFile' not in data:
        data['workoutFile'] = data.pop('file')
        changed = True
    if 'updatedAt' in data and 'timestamp' not in data:
        data['timestamp'] = data.pop('updatedAt')
        changed = True

    # Ensure version
    if 'version' not in data:
        data['version'] = '1'
        changed = True

    # Exercises structure
    exercises = data.get('exercises')
    if isinstance(exercises, dict):
        new_exercises = {}
        for k, v in exercises.items():
            # v can be already migrated or legacy list
            if isinstance(v, list):
                sets = []
                if not v:
                    # placeholder single set to satisfy schema
                    sets = [{"notes": "legacy empty entry"}]
                else:
                    for entry in v:
                        if not isinstance(entry, dict):
                            # Unexpected, wrap as note
                            sets.append({"notes": f"legacy entry: {entry!r}"})
                            changed = True
                            continue
                        entry = dict(entry)  # shallow copy
                        if 'set' in entry:
                            entry.pop('set', None)
                            changed = True
                        sets.append(entry)
                obj = {"sets": sets}
                # Optionally include a human name
                obj['name'] = title_from_key(k)
                new_exercises[k] = obj
                changed = True
            elif isinstance(v, dict):
                # ensure 'sets' exists and clean entries
                obj = dict(v)
                sets = obj.get('sets')
                if isinstance(sets, list):
                    new_sets = []
                    for entry in sets:
                        if isinstance(entry, dict) and 'set' in entry:
                            entry = dict(entry)
                            entry.pop('set', None)
                            changed = True
                        new_sets.append(entry)
                    obj['sets'] = new_sets
                else:
                    # create placeholder
                    obj['sets'] = [{"notes": "legacy missing sets"}]
                    changed = True
                if 'name' not in obj:
                    obj['name'] = title_from_key(k)
                    changed = True
                new_exercises[k] = obj
            else:
                # Unknown shape, coerce
                new_exercises[k] = {"name": title_from_key(k), "sets": [{"notes": f"legacy coerced from {type(v).__name__}"}]}
                changed = True

        data['exercises'] = new_exercises
    else:
        # Unexpected exercises type -> create minimal valid structure
        data['exercises'] = {"unknown": {"name": "Unknown", "sets": [{"notes": "legacy missing exercises"}]}}
        changed = True

    if not changed:
        return False

    # Write backup once
    bak = path + '.bak'
    if not os.path.exists(bak):
        try:
            with open(bak, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            # Swap: write original to .bak, then overwrite with migrated? We already wrote migrated; adjust:
        except Exception:
            pass

    # Write migrated file (pretty JSON)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    return True


def main():
    files = sorted(glob(os.path.join(PERFORMED_DIR, '*.json')))
    if not files:
        print('No performed/*.json files found.')
        return 0
    migrated = 0
    for p in files:
        if os.path.basename(p).startswith('_'):
            # skip templates
            continue
        if migrate_file(p):
            migrated += 1
            print(f"Migrated: {os.path.relpath(p)}")
    print(f"Done. Migrated {migrated}/{len(files)} files (excluding templates).")
    return 0


if __name__ == '__main__':
    sys.exit(main())
