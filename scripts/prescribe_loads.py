#!/usr/bin/env python3
"""
Helper: surface recent performed exports for an exercise name (perf-1 legacy + perf-2 nested logs)
to guide prescriptions.
 - Normalizes exercise names to slugs (lowercase, alnum->-, collapse dashes).
 - Scans performed/*.json, aggregates the last 1–3 entries per normalized key, and now suffixes
     keys with `_angle` so incline vs flat prescriptions stay distinct (`slug_0` when no angle).
 - Prints a compact summary and suggested conservative progression heuristic.

Usage:
    python3 scripts/prescribe_loads.py --exercise "Neutral-Grip Flat Bench Press (Dumbbells)" --n 3
    python3 scripts/prescribe_loads.py --list-keys

Notes:
- This does not write workouts; it’s a planning aid for Kai.
- Dumbbell per-hand entries may appear as weight + multiplier; we display both.
- Angle defaults to `_0` when prescriptions/logs omit the field so legacy data remains accessible.
"""
from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

RE_NONALNUM = re.compile(r"[^a-z0-9]+")

ALIASES: Dict[str, List[str]] = {
    # map canonical -> list of alias keys (already-normalized)
    "neutral-grip-flat-bench-press": ["flat-dumbbell-bench-press", "neutral-grip-db-bench", "flat-db-bench"],
    "one-arm-dumbbell-row": ["1-arm-db-row", "one-arm-db-row"],
    "goblet-squat": ["dumbbell-goblet-squat"],
}


def slugify(name: str) -> str:
    s = name.lower().strip()
    s = RE_NONALNUM.sub("-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s


def canonical_keys_for(name: str) -> List[str]:
    key = slugify(name)
    keys = [key]
    # add alias candidates
    for canon, alist in ALIASES.items():
        if key == canon or key in alist:
            keys = [canon] + alist
            break
    return keys


def build_angle_key(slug: str, angle: int | None) -> str:
    safe_angle = angle if isinstance(angle, int) else 0
    return f"{slug}_{safe_angle}"


def parse_angle(value: Any) -> int | None:
    if value is None:
        return None
    try:
        num = int(round(float(value)))
    except (TypeError, ValueError):
        return None
    return num


def format_weight(weight_val: Any, multiplier: Any) -> str:
    if isinstance(weight_val, (int, float)):
        if multiplier:
            return f"{weight_val} x{multiplier}"
        return str(weight_val)
    return str(weight_val) if weight_val is not None else ""


def detect_angle_from_sets(sets: Iterable[Dict[str, Any]] | None) -> int | None:
    if not sets:
        return None
    for row in sets:
        angle = parse_angle(row.get("angle"))
        if angle is not None:
            return angle
    return None

@dataclass
class SetRow:
    weight: str
    reps: int | None
    rpe: float | None
    set: int | None
    angle: int | None = None


def collect_perf1_entries(data: Dict[str, Any]) -> Dict[str, List[SetRow]]:
    exes = data.get("exercises") or {}
    result: Dict[str, List[SetRow]] = {}
    for key, val in exes.items():
        sets_list = None
        slug_key = slugify(key) if isinstance(key, str) else ""
        if isinstance(val, list):
            sets_list = val
        elif isinstance(val, dict) and isinstance(val.get("sets"), list):
            sets_list = val["sets"]
            if not slug_key:
                slug_key = slugify(val.get("name", ""))
        else:
            continue

        if not slug_key:
            continue

        rows: List[SetRow] = []
        for s in sets_list:
            if not isinstance(s, dict):
                continue
            weight_str = format_weight(s.get("weight"), s.get("multiplier"))
            rows.append(SetRow(
                weight=weight_str,
                reps=s.get("reps"),
                rpe=s.get("rpe"),
                set=s.get("set"),
                angle=parse_angle(s.get("angle"))
            ))
        if rows:
            angle_val = detect_angle_from_sets(sets_list)
            result.setdefault(build_angle_key(slug_key, angle_val), []).extend(rows)
    return result


def collect_perf2_entries(data: Dict[str, Any]) -> Dict[str, List[SetRow]]:
    sections = data.get("sections")
    result: Dict[str, List[SetRow]] = {}
    if not isinstance(sections, list):
        return result

    for section in sections:
        items = section.get("items", []) if isinstance(section, dict) else []
        for item in items:
            kind = item.get("kind")
            if kind == "exercise" and isinstance(item.get("sets"), list):
                slug = slugify(item.get("name", ""))
                if not slug:
                    continue
                angle_val = detect_angle_from_sets(item["sets"])
                key = build_angle_key(slug, angle_val)
                for set_entry in item["sets"]:
                    if not isinstance(set_entry, dict):
                        continue
                    weight_str = format_weight(set_entry.get("weight"), set_entry.get("multiplier"))
                    angle_for_row = parse_angle(set_entry.get("angle"))
                    result.setdefault(key, []).append(SetRow(
                        weight=weight_str,
                        reps=set_entry.get("reps"),
                        rpe=set_entry.get("rpe"),
                        set=set_entry.get("set"),
                        angle=angle_for_row if angle_for_row is not None else angle_val
                    ))
            elif kind in {"superset", "circuit"} and isinstance(item.get("rounds"), list):
                for round_entry in item["rounds"]:
                    exercises = round_entry.get("exercises", [])
                    round_num = round_entry.get("round")
                    for ex in exercises:
                        if not isinstance(ex, dict):
                            continue
                        slug = ex.get("key") or slugify(ex.get("name", ""))
                        if not slug:
                            continue
                        angle_val = parse_angle(ex.get("angle"))
                        key = build_angle_key(slug, angle_val)
                        weight_str = format_weight(ex.get("weight"), ex.get("multiplier"))
                        result.setdefault(key, []).append(SetRow(
                            weight=weight_str,
                            reps=ex.get("reps"),
                            rpe=ex.get("rpe"),
                            set=round_num,
                            angle=angle_val
                        ))
    return result


def collect(repo_root: Path) -> Dict[str, List[Tuple[str, List[SetRow]]]]:
    logs = sorted((repo_root / "performed").glob("*.json"))
    out: Dict[str, List[Tuple[str, List[SetRow]]]] = {}
    for path in logs:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue

        if isinstance(data, dict) and (data.get("version") == "perf-2" or "sections" in data):
            entries = collect_perf2_entries(data)
        else:
            entries = collect_perf1_entries(data)

        for key, rows in entries.items():
            if not rows:
                continue
            out.setdefault(key, []).append((path.name, rows))
    return out


def describe_angle_suffix(key: str) -> str:
    if "_" not in key:
        return ""
    _, suffix = key.rsplit("_", 1)
    try:
        angle = int(suffix)
    except ValueError:
        return ""
    if angle > 0:
        return f" ({angle}° incline)"
    if angle < 0:
        return f" ({angle}° decline)"
    return " (flat)"


def matching_keys(data: Dict[str, Any], candidate: str) -> List[str]:
    prefix = f"{candidate}_"
    matches = [k for k in data if k == candidate or k.startswith(prefix)]
    return sorted(matches)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--exercise", help="exercise name to look up", default=None)
    ap.add_argument("--n", type=int, default=3, help="max logs to show per exercise")
    ap.add_argument("--list-keys", action="store_true", help="list all normalized keys found")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    data = collect(repo_root)

    if args.list_keys:
        keys = sorted(data.keys())
        for k in keys:
            print(k)
        return 0

    if not args.exercise:
        ap.error("--exercise NAME is required unless --list-keys is used")

    keys = canonical_keys_for(args.exercise)
    printed = False
    seen: set[str] = set()
    for base in keys:
        matches = [k for k in matching_keys(data, base) if k not in seen]
        if not matches:
            continue
        for k in matches:
            seen.add(k)
            print(f"History for: {k}{describe_angle_suffix(k)}")
            entries = data[k][-args.n:]
            for fname, rows in entries:
                print(f"- {fname}")
                for r in rows:
                    parts = []
                    if r.weight:
                        parts.append(f"weight={r.weight}")
                    if r.reps is not None:
                        parts.append(f"reps={r.reps}")
                    if r.rpe is not None:
                        parts.append(f"rpe={r.rpe}")
                    if r.set is not None:
                        parts.append(f"set={r.set}")
                    if r.angle is not None:
                        parts.append(f"angle={r.angle}°")
                    print("  " + ", ".join(parts))
            print()
        printed = True
        if printed:
            break
    if not printed:
        print("No history found for that exercise name. Try --list-keys to see available.")
    else:
        print("\nSuggestion: If RPE ≤ 8 and all reps completed last time, add +2.5–5 lb per hand (upper) or +5–10 lb (lower), or add reps within range.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
