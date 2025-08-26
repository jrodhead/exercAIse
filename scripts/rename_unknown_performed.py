#!/usr/bin/env python3
"""
Rename performed/*_unknown.json files to include the session base filename and
normalize the internal workoutFile field to 'workouts/...'.
"""
import json
import os
import re
from glob import glob

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PERFORMED = os.path.join(ROOT, 'performed')

def normalize_workout_file(p: str) -> str:
    p = str(p or '').strip()
    # strip leading ../ or ./
    p = re.sub(r'^(?:\.\.\/)+', '', p)
    p = re.sub(r'^\.\/', '', p)
    # if contains workouts/ somewhere, slice from there
    m = re.search(r'(workouts\/.*)$', p)
    if m:
        p = m.group(1)
    return p

def main():
    files = sorted(glob(os.path.join(PERFORMED, '*_unknown.json')))
    if not files:
        print('No *_unknown.json files found.')
        return 0
    renamed = 0
    for path in files:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            print(f'SKIP {os.path.relpath(path)}: invalid JSON ({e})')
            continue
        wf = data.get('workoutFile') or data.get('file') or 'unknown'
        wf = normalize_workout_file(wf)
        data['workoutFile'] = wf
        data.pop('file', None)
        # Derive base name
        base = os.path.basename(wf) if wf and wf != 'unknown' else 'unknown.json'
        # Ensure .json suffix comes from target; if base already has .md, keep it in name per convention
        # Extract timestamp prefix from current filename
        cur = os.path.basename(path)
        ts = cur.split('_', 1)[0]
        new_name = f"{ts}_{base}.json"
        new_path = os.path.join(PERFORMED, new_name)
        # Write new file and remove old
        with open(new_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        os.remove(path)
        print(f'Renamed: {os.path.relpath(path)} -> {os.path.relpath(new_path)}')
        renamed += 1
    print(f'Done. Renamed {renamed} files.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
