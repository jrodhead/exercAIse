#!/usr/bin/env python3
"""
Convert exercise Markdown files in exercises/ to JSON per schemas/exercise.schema.json.

Usage:
  python3 scripts/md_to_exercise_json.py [--force] [--dry-run] [--only NAME[,NAME2,...]]

Behavior:
  - Reads each exercises/*.md file and attempts to extract:
      name (from first H1 or filename), cues (from Tips/Cues/How to Perform),
      variations (from Variations), equipment (keyword inference), safety (from Safety/Notes),
      tags (keyword inference from title/body)
  - Writes exercises/<slug>.json next to the MD file.
  - Skips existing JSON unless --force.
  - Designed to be idempotent and conservative: it never deletes content.

Notes:
  - This is a heuristic converter to bootstrap JSON; please review outputs for accuracy.
"""

import argparse
import json
import os
import re
from glob import glob
from typing import List, Dict

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
EX_DIR = os.path.join(ROOT, 'exercises')
SCHEMA_PATH = os.path.join(ROOT, 'schemas', 'exercise.schema.json')


def slugify(name: str) -> str:
    s = name.strip().lower()
    s = re.sub(r"[^a-z0-9\s_\-/]", '', s)
    s = s.replace('/', '_').replace('-', '_')
    s = re.sub(r"\s+", '_', s)
    s = re.sub(r"_+", '_', s)
    return s


def read_text(path: str) -> str:
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def first_h1(text: str) -> str:
    for line in text.splitlines():
        m = re.match(r"^#\s+(.+)$", line.strip())
        if m:
            return m.group(1).strip()
    return ''


def extract_section(text: str, titles: List[str]) -> str:
    # Return content under the first matching H2 whose title matches any in titles (case-insensitive)
    lines = text.splitlines()
    content_lines: List[str] = []
    capture = False
    for i, line in enumerate(lines):
        h2 = re.match(r"^##\s+(.+)$", line.strip())
        if h2:
            cur = h2.group(1).strip().lower()
            if any(cur.startswith(t.lower()) for t in titles):
                capture = True
                continue
            else:
                if capture:
                    break
        if capture:
            content_lines.append(line)
    return "\n".join(content_lines).strip()


def bullets_and_numbers_to_list(section_text: str) -> List[str]:
    cues: List[str] = []
    for raw in section_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        # bullets: -, *, or numbered 1. 2.
        if re.match(r"^[-*]\s+", line):
            cues.append(re.sub(r"^[-*]\s+", '', line).strip())
        elif re.match(r"^\d+\.\s+", line):
            cues.append(re.sub(r"^\d+\.\s+", '', line).strip())
    return [c for c in (c.strip(' .') for c in cues) if c]


EQUIPMENT_KWS = [
    ('dumbbell', 'dumbbell'),
    ('barbell', 'barbell'),
    ('kettlebell', 'kettlebell'),
    ('band', 'band'),
    ('bench', 'bench'),
    ('ruck', 'ruck'),
    ('cable', 'cable'),
    ('machine', 'machine'),
    ('foam roll', 'foam roller'),
]

TAG_KWS = [
    ('squat', 'squat'),
    ('lunge', 'lunge'),
    ('hinge', 'hinge'),
    ('deadlift', 'hinge'),
    ('row', 'row'),
    ('press', 'press'),
    ('curl', 'curl'),
    ('triceps', 'triceps'),
    ('carry', 'carry'),
    ('march', 'carry'),
    ('plank', 'core'),
    ('core', 'core'),
    ('stretch', 'stretch'),
    ('pose', 'yoga'),
    ('yoga', 'yoga'),
    ('run', 'conditioning'),
    ('walk', 'conditioning'),
    ('stride', 'conditioning'),
]


def infer_equipment(text: str) -> List[str]:
    t = text.lower()
    found: List[str] = []
    for kw, tag in EQUIPMENT_KWS:
        if kw in t:
            found.append(tag)
    # If no equipment keywords found, assume bodyweight for stretches/yoga/core
    if not found:
        if any(w in t for w in ['stretch', 'pose', 'yoga', 'plank', 'bodyweight', 'bridge', 'twist', 'fold', 'childs', 'pigeon']):
            found.append('bodyweight')
    # Deduplicate
    return sorted(list(dict.fromkeys(found)))


def infer_tags(text: str) -> List[str]:
    t = text.lower()
    tags: List[str] = []
    for kw, tg in TAG_KWS:
        if kw in t:
            tags.append(tg)
    # Deduplicate
    return sorted(list(dict.fromkeys(tags)))


def parse_md_to_json(md_path: str) -> Dict:
    text = read_text(md_path)
    name = first_h1(text)
    if not name:
        # fallback to filename
        base = os.path.basename(md_path).rsplit('.', 1)[0]
        name = base.replace('_', ' ').title()

    # Collect cues from common sections
    cues = []
    cues += bullets_and_numbers_to_list(extract_section(text, ['How to Perform', 'How-To']))
    cues += bullets_and_numbers_to_list(extract_section(text, ['Tips', 'Coaching Cues', 'Cues']))
    # Fallback: if no sections found, take any top-level bullet/numbered lists (limited to first 10)
    if not cues:
        cues = bullets_and_numbers_to_list(text)
        cues = cues[:10]

    # Variations
    variations = bullets_and_numbers_to_list(extract_section(text, ['Variations', 'Alternatives']))

    # Safety/Notes
    safety_section = extract_section(text, ['Safety', 'Safety Notes', 'Injury Notes', 'Notes'])
    safety = ''
    if safety_section:
        # Keep plain text by removing bullet markers
        safety_lines = [re.sub(r"^[-*]\s+", '', ln).strip() for ln in safety_section.splitlines() if ln.strip()]
        safety = ' '.join(safety_lines)

    equipment = infer_equipment(name + '\n' + text)
    tags = infer_tags(name + '\n' + text)

    data = {
        'name': name,
    }
    if equipment:
        data['equipment'] = equipment
    if tags:
        data['tags'] = tags
    if cues:
        data['cues'] = cues
    if safety:
        data['safety'] = safety
    if variations:
        data['variations'] = variations
    return data


def save_json(path: str, data: Dict, dry_run: bool = False):
    js = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
    if dry_run:
        print(f"[dry-run] Would write: {os.path.relpath(path)}")
        return
    with open(path, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f"Wrote: {os.path.relpath(path)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--force', action='store_true', help='Overwrite existing JSON files')
    ap.add_argument('--dry-run', action='store_true', help='Do not write files; just report actions')
    ap.add_argument('--only', type=str, help='Comma-separated list of basenames (without extension) to convert')
    args = ap.parse_args()

    targets = sorted(glob(os.path.join(EX_DIR, '*.md')))
    if args.only:
        wanted = set(s.strip().lower() for s in args.only.split(',') if s.strip())
        targets = [p for p in targets if os.path.splitext(os.path.basename(p))[0].lower() in wanted]

    if not targets:
        print('No Markdown exercises found to convert.')
        return

    for md_path in targets:
        base = os.path.basename(md_path)
        stem = base.rsplit('.', 1)[0]
        json_path = os.path.join(EX_DIR, stem + '.json')
        if os.path.exists(json_path) and not args.force:
            print(f"Skip (exists): {os.path.relpath(json_path)}")
            continue
        try:
            data = parse_md_to_json(md_path)
        except Exception as e:
            print(f"ERROR parsing {base}: {e}")
            continue
        save_json(json_path, data, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
