#!/usr/bin/env python3
"""
Convert workout markdown files under workouts/ to structured session JSON (schemas/session.schema.json).

Heuristics:
- Title: first H1 (# ...)
- Sections: split by H2/H3 lines; section type inferred from heading text.
- Items: detect exercise links [Name](../exercises/<slug>.json) within lists/paragraphs as items of kind 'exercise'.
- Attach nearby bullet items (next lines starting with - or *) as cues for that exercise.

Outputs <same-name>.json next to the .md and does not delete the original.
"""
import re, os, sys, json, glob
from typing import Optional

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
WORKOUTS = os.path.join(ROOT, 'workouts')

SECTION_TYPES = [
    ('Warm-up', ['warm', 'warm-up', 'warm up', 'warmup']),
    ('Cooldown/Recovery', ['cool', 'cool-down', 'cool down', 'cooldown', 'recovery']),
    ('Mobility', ['mobility', 'yoga']),
    ('Conditioning', ['conditioning', 'endurance', 'run', 'bike', 'row', 'swim']),
    ('Strength', ['strength', 'main', 'lifts']),
    ('Accessory/Core', ['accessory', 'core'])
]

def infer_type(title: str) -> str:
    t = (title or '').strip().lower()
    for typ, keys in SECTION_TYPES:
        if any(k in t for k in keys):
            return typ
    return 'Main Work'

H1 = re.compile(r'^#\s+(.+)$', re.M)
H2 = re.compile(r'^##\s+(.+)$', re.M)
H3 = re.compile(r'^###\s+(.+)$', re.M)
LINK = re.compile(r"\[(?P<text>[^\]]+)\]\((?P<href>[^\)]+exercises/[\w\-]+\.(?:md|json))\)")

def try_parse_embedded_session_json(md: str):
    """If the markdown contains a fenced JSON block with session structure, return that object.
    Priority: blocks whose fence line contains 'session-structure'; fallback to any JSON block
    that parses and contains a top-level 'sections' array.
    """
    # Find all fenced json blocks
    blocks = []
    fence = re.compile(r"```json([^\n]*)\n([\s\S]*?)\n```", re.I)
    for m in fence.finditer(md):
        meta = (m.group(1) or '').strip().lower()
        body = m.group(2) or ''
        blocks.append((meta, body))
    # Prefer those with 'session-structure' token
    preferred = [b for b in blocks if 'session-structure' in (b[0] or '')]
    ordered = preferred if preferred else blocks
    for _, body in reversed(ordered):  # last wins
        try:
            obj = json.loads(body)
            if isinstance(obj, dict) and isinstance(obj.get('sections'), list):
                return obj
        except Exception:
            continue
    return None

def normalize_links_in_session(obj: dict) -> dict:
    """Walk the session JSON and normalize exercise links to 'exercises/<slug>.json'."""
    def slugify(s: str) -> str:
        return re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')

    def fix_link(name: str, link: Optional[str]) -> str:
        if link and isinstance(link, str):
            # Keep only trailing exercises/<slug>.json
            m = re.search(r"exercises/([\w\-]+)\.(?:md|json)$", link)
            if m:
                return f"exercises/{m.group(1)}.json"
        # Fallback from name
        if name:
            return f"exercises/{slugify(name)}.json"
        return link or ''

    def walk(n):
        if isinstance(n, list):
            for x in n: walk(x)
            return
        if not isinstance(n, dict):
            return
        # normalize for exercise nodes
        if (n.get('kind') == 'exercise' or 'name' in n) and 'link' in n:
            n['link'] = fix_link(n.get('name', ''), n.get('link'))
        # also normalize any 'exercise' string field
        if 'exercise' in n and isinstance(n['exercise'], str) and 'link' not in n:
            n['link'] = fix_link(n['exercise'], n.get('link'))
        for k in list(n.keys()):
            walk(n[k])

    walk(obj)
    if 'version' not in obj:
        obj['version'] = '1'
    return obj

def merge_md_annotations_into_session(md: str, obj: dict) -> dict:
    """Merge cues and simple prescriptions from markdown into the embedded session JSON.
    - For each exercise link line, collect immediate bullet lines below as cues.
    - Parse inline patterns on the link line for sets/reps/rpe/weight/time/distance; attach as 'prescription' if missing.
    Matching is by slug derived from link href or name.
    """
    lines = md.splitlines()
    # Map slug -> { cues: [...], text: full_line_text }
    found = {}
    for i, line in enumerate(lines):
        lm = LINK.search(line)
        if not lm:
            continue
        href = lm.group('href').strip()
        mslug = re.search(r"exercises/([\w\-]+)\.(?:md|json)$", href)
        slug = mslug.group(1) if mslug else re.sub(r'[^a-z0-9]+', '-', lm.group('text').lower()).strip('-')
        cues = []
        j = i + 1
        while j < len(lines):
            nxt = lines[j]
            if re.match(r'^\s*[-*]\s+', nxt):
                cues.append(re.sub(r'^\s*[-*]\s+', '', nxt).strip())
                j += 1
                continue
            if re.match(r'^#{1,6}\s+', nxt) or LINK.search(nxt):
                break
            # stop on blank line
            if not nxt.strip():
                break
            j += 1
        found[slug] = {
            'cues': cues,
            'line': line.strip()
        }

    def parse_prescription(text: str):
        if not text:
            return None
        pres = {}
        m = re.search(r"(\d{1,2})\s*[x×]\s*(\d{1,3})", text, re.I)
        if m:
            pres['sets'] = int(m.group(1))
            pres['reps'] = int(m.group(2))
        m = re.search(r"(\d{1,2})\s*sets?\s*(?:of|x)?\s*(\d{1,3})", text, re.I)
        if 'sets' not in pres and m:
            pres['sets'] = int(m.group(1))
            pres['reps'] = int(m.group(2))
        m = re.search(r"RPE\s*(\d{1,2}(?:\.\d+)?)", text, re.I)
        if m:
            pres['rpe'] = float(m.group(1))
        m = re.search(r"(\d{1,3}(?:\.\d+)?)\s*(lb|lbs|kg)", text, re.I)
        if m:
            pres['weight'] = float(m.group(1))
        # multiplier
        if re.search(r"per\s*hand|each|per\s*side|x2|×2", text, re.I):
            pres['multiplier'] = 2
        if re.search(r"bodyweight", text, re.I):
            pres['multiplier'] = 0
        # time
        m = re.search(r"\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b", text)
        if m:
            h = int(m.group(3) is not None and m.group(1) or 0)
            mm = int(m.group(3) is not None and m.group(2) or m.group(1))
            ss = int(m.group(3) is not None and m.group(3) or m.group(2))
            pres['timeSeconds'] = h * 3600 + mm * 60 + ss
        else:
            m2 = re.search(r"(\d{1,3})\s*(?:min|minutes?)\b", text, re.I)
            if m2:
                pres['timeSeconds'] = int(m2.group(1)) * 60
        # distance (miles)
        m = re.search(r"(\d+(?:\.\d+)?)\s*(?:mi|miles?|mile)\b", text, re.I)
        if m:
            pres['distanceMiles'] = float(m.group(1))
        return pres if pres else None

    def apply_to_items(items):
        for it in items:
            if not isinstance(it, dict):
                continue
            if it.get('kind') == 'exercise' and (it.get('name') or it.get('exercise')):
                name = it.get('name') or it.get('exercise')
                slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
                # prefer link-derived slug
                if it.get('link'):
                    m = re.search(r"exercises/([\w\-]+)\.(?:md|json)$", it['link'])
                    if m:
                        slug = m.group(1)
                meta = found.get(slug)
                if meta:
                    # merge cues
                    if meta['cues']:
                        it.setdefault('cues', [])
                        # extend unique
                        for c in meta['cues']:
                            if c not in it['cues']:
                                it['cues'].append(c)
                    # merge prescription if none present
                    if 'prescription' not in it:
                        pres = parse_prescription(meta['line'])
                        if pres:
                            it['prescription'] = pres
            # recurse into composites
            for k, v in list(it.items()):
                if isinstance(v, list):
                    apply_to_items(v)

    for sec in obj.get('sections', []):
        if isinstance(sec, dict) and isinstance(sec.get('items'), list):
            apply_to_items(sec['items'])
    return obj

def parse_md(md: str) -> dict:
    title = None
    m = H1.search(md)
    if m:
        title = m.group(1).strip()
    # Build sections split by H2/H3
    parts = []
    indices = []
    for rx in (H2, H3):
        for mm in rx.finditer(md):
            indices.append((mm.start(), mm.group(1).strip()))
    indices.sort()
    if not indices:
        # Single implicit section
        parts = [(infer_type('Main'), md)]
    else:
        for i, (pos, head) in enumerate(indices):
            end = indices[i+1][0] if i+1 < len(indices) else len(md)
            parts.append((head, md[pos:end]))

    # First: prefer embedded JSON session blocks
    embedded = try_parse_embedded_session_json(md)
    if embedded:
        embedded = normalize_links_in_session(embedded)
        embedded = merge_md_annotations_into_session(md, embedded)
        return embedded

    sections = []
    for head, chunk in parts:
        items = []
        # scan for exercise links
        for lm in LINK.finditer(chunk):
            name = lm.group('text').strip()
            href = lm.group('href').strip()
            # collect immediate following bullets as cues
            cues = []
            # find following lines after the link line
            start_line = md[:lm.start()].count('\n')
            lines = md.splitlines()
            j = start_line + 1
            while j < len(lines):
                line = lines[j]
                if re.match(r'^\s*[-*]\s+', line):
                    cues.append(re.sub(r'^\s*[-*]\s+', '', line).strip())
                    j += 1
                    continue
                # stop at next heading
                if re.match(r'^#{1,6}\s+', line):
                    break
                # stop if another exercise link is encountered
                if LINK.search(line):
                    break
                j += 1
            items.append({
                'kind': 'exercise',
                'name': name,
                'link': href.replace('../', '').replace('./', ''),
                'cues': cues
            })
        sec = {
            'type': infer_type(head),
            'title': head,
            'items': items
        }
        sections.append(sec)

    return {
        'version': '1',
        'title': title or 'Workout Session',
        'block': 0,
        'week': 0,
        'sections': sections
    }

def iter_md_files(args):
    if args:
        seen = set()
        for arg in args:
            paths = []
            if os.path.isabs(arg):
                paths = glob.glob(arg)
            else:
                paths = glob.glob(os.path.join(WORKOUTS, arg))
            for p in paths:
                if p.endswith('.md') and os.path.isfile(p) and p not in seen:
                    seen.add(p)
                    yield p
        return
    # default: all md files under workouts
    for name in os.listdir(WORKOUTS):
        if name.endswith('.md'):
            yield os.path.join(WORKOUTS, name)

def main():
    count = 0
    for md_path in iter_md_files(sys.argv[1:]):
        name = os.path.basename(md_path)
        json_path = os.path.join(WORKOUTS, os.path.splitext(name)[0] + '.json')
        try:
            with open(md_path, 'r', encoding='utf-8') as f:
                md = f.read()
            data = parse_md(md)
            # try to infer block/week from title or body or filename
            title = None
            m = re.search(r'^#\s+(.+)$', md, re.M)
            if m: title = m.group(1)
            text_for_bw = (title or '') + '\n' + md + '\n' + name
            m = re.search(r'Block\s*(\d+)', text_for_bw, re.I)
            if m: data['block'] = int(m.group(1))
            m = re.search(r'Week\s*(\d+)', text_for_bw, re.I)
            if m: data['week'] = int(m.group(1))
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            print('Wrote', os.path.relpath(json_path, ROOT))
            count += 1
        except Exception as e:
            print('Error converting', name, ':', e)
    print('Converted', count, 'files')

if __name__ == '__main__':
    main()
