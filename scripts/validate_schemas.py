#!/usr/bin/env python3
"""
Validate performed logs and JSON workout sessions against JSON Schemas.

Usage:
  python3 scripts/validate_schemas.py

Behavior:
  - Validates all JSON files under performed/ against schemas/performed.schema.json
    - Validates any JSON files under workouts/ against schemas/session.schema.json
    - If a Markdown workout contains a trailing fenced JSON block (```json or ```json session-structure), validate that block against the session schema
  - Exits non-zero on validation errors; prints a concise summary.
  - If jsonschema is not installed, prints a helpful message and exits 2.
"""

import json
import os
import sys
from glob import glob

SCHEMA_DIR = os.path.join(os.path.dirname(__file__), '..', 'schemas')
PERFORMED_SCHEMA_PATH = os.path.abspath(os.path.join(SCHEMA_DIR, 'performed.schema.json'))
SESSION_SCHEMA_PATH = os.path.abspath(os.path.join(SCHEMA_DIR, 'session.schema.json'))
EXERCISE_SCHEMA_PATH = os.path.abspath(os.path.join(SCHEMA_DIR, 'exercise.schema.json'))


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def main():
    try:
        from jsonschema import Draft7Validator, RefResolver
    except Exception:
        print("Schema validation requires the 'jsonschema' package.\nInstall with: pip install jsonschema", file=sys.stderr)
        sys.exit(2)

    performed_schema = load_json(PERFORMED_SCHEMA_PATH)
    session_schema = load_json(SESSION_SCHEMA_PATH)
    exercise_schema = load_json(EXERCISE_SCHEMA_PATH)

    # Prepare validators
    base_uri = 'file://' + os.path.abspath(SCHEMA_DIR) + '/'
    performed_resolver = RefResolver(base_uri=base_uri, referrer=performed_schema)
    session_resolver = RefResolver(base_uri=base_uri, referrer=session_schema)
    performed_validator = Draft7Validator(performed_schema, resolver=performed_resolver)
    session_validator = Draft7Validator(session_schema, resolver=session_resolver)
    exercise_validator = Draft7Validator(exercise_schema, resolver=performed_resolver)

    errors = []

    # Validate performed logs
    performed_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'performed'))
    performed_files = sorted(glob(os.path.join(performed_dir, '*.json')))
    for path in performed_files:
        try:
            data = load_json(path)
        except Exception as e:
            errors.append((path, f'Invalid JSON: {e}'))
            continue
        for err in performed_validator.iter_errors(data):
            errors.append((path, err.message))

    # Validate JSON workouts (if any)
    workouts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'workouts'))
    workout_json_files = sorted(glob(os.path.join(workouts_dir, '*.json')))
    for path in workout_json_files:
        try:
            data = load_json(path)
        except Exception as e:
            errors.append((path, f'Invalid JSON: {e}'))
            continue
        for err in session_validator.iter_errors(data):
            errors.append((path, err.message))

    # Validate embedded JSON blocks in Markdown workouts (if present)
    # Validate exercises JSON
    ex_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'exercises'))
    ex_json = sorted(glob(os.path.join(ex_dir, '*.json')))
    for path in ex_json:
        try:
            data = load_json(path)
        except Exception as e:
            errors.append((path, f'Invalid JSON: {e}'))
            continue
        for err in exercise_validator.iter_errors(data):
            errors.append((path, err.message))
    workout_md_files = sorted(glob(os.path.join(workouts_dir, '*.md')))
    for path in workout_md_files:
        try:
            text = ''
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
        except Exception as e:
            errors.append((path, f'Cannot read: {e}'))
            continue
        # Find last fenced code block labeled json (optionally with a label)
        # Patterns: ```json\n...\n```  OR  ```json session-structure\n...\n```
        import re
        blocks = list(re.finditer(r"```json(?:[^\n]*)\n([\s\S]*?)\n```", text))
        if not blocks:
            continue
        block = blocks[-1]
        json_text = block.group(1)
        try:
            data = json.loads(json_text)
        except Exception as e:
            errors.append((path, f'Embedded JSON block invalid JSON: {e}'))
            continue
        for err in session_validator.iter_errors(data):
            errors.append((path, f'Embedded JSON block: {err.message}'))

    if errors:
        print('Schema validation FAILED:')
        for path, msg in errors:
            print(f' - {os.path.relpath(path)}: {msg}')
        sys.exit(1)
    else:
        print('Schema validation OK (no issues found).')
        if not performed_files and not workout_json_files:
            print('(No JSON files found under performed/ or workouts/ to validate.)')


if __name__ == '__main__':
    main()
