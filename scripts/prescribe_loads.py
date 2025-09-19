#!/usr/bin/env python3
"""
Helper: surface recent performed (perf-1) export loads for an exercise name to guide prescriptions.
 - Normalizes exercise names to slugs (lowercase, alnum->-, collapse dashes).
 - Scans performed/*.json (perf-1 schema) and aggregates the last 1–3 entries per normalized key.
 - Prints a compact summary and suggested conservative progression heuristic.

Usage:
  python3 scripts/prescribe_loads.py --exercise "Neutral-Grip Flat Bench Press (Dumbbells)" --n 3
  python3 scripts/prescribe_loads.py --list-keys

Notes:
- This does not write workouts; it’s a planning aid for Kai.
- Dumbbell per-hand entries may appear as weight + multiplier; we display both.
"""
from __future__ import annotations
import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

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

@dataclass
class SetRow:
    weight: str
    reps: int | None
    rpe: float | None
    set: int | None


def collect(repo_root: Path) -> Dict[str, List[Tuple[str, List[SetRow]]]]:
    logs = sorted((repo_root / "performed").glob("*.json"))
    out: Dict[str, List[Tuple[str, List[SetRow]]]] = {}
    for path in logs:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        exes = data.get("exercises") or {}
        for key, val in exes.items():
            # Support two shapes:
            # A) key -> [ {weight, reps, ...}, ... ]
            # B) key -> { name, sets: [ {weight, reps, ...}, ... ] }
            sets_list = None
            if isinstance(val, list):
                sets_list = val
            elif isinstance(val, dict) and isinstance(val.get("sets"), list):
                sets_list = val["sets"]
            else:
                continue

            rows: List[SetRow] = []
            for s in sets_list:
                if not isinstance(s, dict):
                    continue
                weight_val = s.get("weight")
                mult = s.get("multiplier")
                if isinstance(weight_val, (int, float)) and mult:
                    weight_str = f"{weight_val} x{mult}"
                elif isinstance(weight_val, (int, float)):
                    weight_str = str(weight_val)
                else:
                    weight_str = str(weight_val) if weight_val is not None else ""
                rows.append(SetRow(weight=weight_str, reps=s.get("reps"), rpe=s.get("rpe"), set=s.get("set")))
            out.setdefault(key, []).append((path.name, rows))
    return out


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
    for k in keys:
        if k in data:
            print(f"History for: {k}")
            # show last N logs for this key
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
                    print("  "+", ".join(parts))
            printed = True
            break
    if not printed:
        print("No history found for that exercise name. Try --list-keys to see available.")
    else:
        print("\nSuggestion: If RPE ≤ 8 and all reps completed last time, add +2.5–5 lb per hand (upper) or +5–10 lb (lower), or add reps within range.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
