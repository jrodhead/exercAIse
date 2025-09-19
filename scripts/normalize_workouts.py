#!/usr/bin/env python3
"""Normalize workout session JSON files:

1. Add missing `logType` on exercise items using heuristic rules.
2. Normalize legacy links like '../exercises/foo.md' -> 'exercises/foo.json'.

Heuristics (default assumptions approved by user):
 - strength: squat, split squat, lunge, deadlift, rdl, press, bench, row, curl, extension, kickback, fly, raise, step-up, plank shoulder tap, side plank, pallof press, thruster, farmer carry (carry overridden), renegade row, reverse curl, zottman curl
 - endurance: walk, run, jog (when no load/weight specified)
 - carry: names containing 'carry'
 - stretch: names containing stretch, pose, pigeon, dragon, twist, fold, fish, swan, happy baby, child's / childs / child’s (unless explicitly mobility drills like Cat-Cow)
 - mobility: dynamic warm-up drills (circles, swings, cat-cow, deadbug, hollow hold, glute bridge when low volume, world's greatest stretch, leg swings) and core activation (deadbug variants) not otherwise classified
 - Special cases:
    * Glute Bridge: strength if sets >=3 else mobility
    * Hollow Hold: mobility
    * Deadbug / Weighted Deadbug: mobility
    * Side Plank: strength
    * Pallof Press: strength (core anti-rotation loading)

Only adds a logType if missing; never overwrites existing values.
"""
from __future__ import annotations

import json
import os
import sys
from typing import Any, Dict

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKOUT_DIR = os.path.join(REPO_ROOT, "workouts")


def load(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save(path: str, data: Any):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def classify(name: str, presc: Dict[str, Any]) -> str:
    n = name.lower()
    # Carry
    if "carry" in n:
        return "carry"
    # Endurance
    if any(k in n for k in ["walk", "run", "jog"]) and not any(k in presc for k in ["weight", "sets"]):
        return "endurance"
    # Stretch identifiers
    stretch_tokens = [
        "stretch", "pose", "pigeon", "dragon", "twist", "fold", "fish", "swan", "happy baby", "child's", "childs", "child’s"
    ]
    if any(tok in n for tok in stretch_tokens):
        # Exceptions treated as mobility
        if "cat-cow" in n or "cat cow" in n:
            return "mobility"
        return "stretch"
    # Strength movement tokens
    strength_tokens = [
        "squat", "split squat", "lunge", "deadlift", "rdl", "press", "bench", "row", "curl", "extension", "kickback", "fly", "raise", "thruster", "renegade", "step-up", "step up", "reverse curl", "zottman", "pallof", "plank shoulder tap", "side plank"
    ]
    if any(tok in n for tok in strength_tokens):
        return "strength"
    # Core specifics
    if "side plank" in n:
        return "strength"
    if "plank" in n:
        return "strength"
    # Glute bridge special case
    if "glute bridge" in n:
        sets = presc.get("sets")
        if isinstance(sets, int) and sets >= 3:
            return "strength"
        return "mobility"
    # Hollow hold
    if "hollow hold" in n:
        return "mobility"
    # Deadbug variants
    if "deadbug" in n:
        return "mobility"
    # World's Greatest Stretch
    if "world" in n and "stretch" in n:
        return "mobility"
    # Leg swings / circles etc.
    mobility_tokens = ["circle", "circles", "swing", "swings", "cat-cow", "cat cow", "leg swings"]
    if any(tok in n for tok in mobility_tokens):
        return "mobility"
    # Default fallback
    return "mobility"


def normalize_link(link: str) -> str:
    if not isinstance(link, str):
        return link
    if link.startswith("../exercises/"):
        link = "exercises/" + link.split("../exercises/")[-1]
    if link.endswith(".md"):
        link = link[:-3] + ".json"
    return link


def iter_items(item: Dict[str, Any]):
    if not isinstance(item, dict):
        return
    yield item
    if item.get("kind") in ("circuit", "superset"):
        for ch in item.get("children", []) or []:
            for sub in iter_items(ch):
                yield sub


def process_file(path: str):
    changed = False
    data = load(path)
    stats = {"logType_added": 0, "links_fixed": 0}
    sections = data.get("sections") or []
    for sec in sections:
        items = (sec or {}).get("items") or []
        for it in items:
            for node in iter_items(it):
                if not isinstance(node, dict):
                    continue
                if node.get("kind") != "exercise":
                    continue
                link = node.get("link")
                if isinstance(link, str):
                    new_link = normalize_link(link)
                    if new_link != link:
                        node["link"] = new_link
                        changed = True
                        stats["links_fixed"] += 1
                if not node.get("logType"):
                    presc = node.get("prescription") or {}
                    lt = classify(node.get("name", ""), presc if isinstance(presc, dict) else {})
                    node["logType"] = lt
                    changed = True
                    stats["logType_added"] += 1
    if changed:
        save(path, data)
    return stats


def main():
    files = [os.path.join(WORKOUT_DIR, f) for f in os.listdir(WORKOUT_DIR) if f.endswith('.json')]
    agg = {"logType_added": 0, "links_fixed": 0}
    touched = 0
    for fp in sorted(files):
        res = process_file(fp)
        if res["logType_added"] or res["links_fixed"]:
            touched += 1
            agg["logType_added"] += res["logType_added"]
            agg["links_fixed"] += res["links_fixed"]
            print(f"Updated {os.path.relpath(fp, REPO_ROOT)} (+logType {res['logType_added']}, links {res['links_fixed']})")
    print(f"Done. Files changed: {touched}; logType added: {agg['logType_added']}; links fixed: {agg['links_fixed']}")


if __name__ == "__main__":
    sys.exit(main())
