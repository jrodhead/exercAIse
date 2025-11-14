#!/usr/bin/env python3
"""Estimate total working time for workout JSON files."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

DEFAULT_ACTIVE_SECONDS = {
    "strength": 45.0,
    "carry": 60.0,
    "endurance": 60.0,
    "mobility": 30.0,
    "stretch": 30.0,
}

WORKING_SECTION_TYPES = {
    "Strength",
    "Main Work",
    "Conditioning",
    "Accessory/Core",
}

PACE_SECONDS_PER_MILE = 600.0  # 10:00 per mile default
PACE_SECONDS_PER_METER = PACE_SECONDS_PER_MILE / 1609.0


def main(paths: Iterable[str]) -> None:
    files = collect_files(paths)
    if not files:
        raise SystemExit("No workout JSON files found")

    for file_path in files:
        total_sec, working_sec, breakdown = estimate_workout(file_path)
        print(f"\nWorkout: {file_path.name}")
        print(f"  Title: {breakdown['title']}")
        print(f"  Total time (all sections): {total_sec / 60:.1f} min")
        print(f"  Working sections: {working_sec / 60:.1f} min")
        for title, seconds in breakdown["sections"]:
            print(f"    - {title}: {seconds / 60:.1f} min")
        if working_sec > 40 * 60:
            print("  ⚠️  Working time exceeds 40 minutes")


def collect_files(paths: Iterable[str]) -> List[Path]:
    files: List[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_dir():
            files.extend(sorted(p for p in path.glob("*.json") if p.is_file()))
        elif path.suffix == ".json" and path.is_file():
            files.append(path)
    return files


def estimate_workout(path: Path) -> Tuple[float, float, Dict[str, object]]:
    data = json.loads(path.read_text())
    total_seconds = 0.0
    working_seconds = 0.0
    section_breakdown: List[Tuple[str, float]] = []

    for section in data.get("sections", []):
        section_seconds = 0.0
        for item in section.get("items", []):
            section_seconds += estimate_item(item)
        section_breakdown.append((section.get("title", "Unnamed Section"), section_seconds))
        total_seconds += section_seconds
        if section.get("type") in WORKING_SECTION_TYPES:
            working_seconds += section_seconds

    return total_seconds, working_seconds, {
        "title": data.get("title", ""),
        "sections": section_breakdown,
    }


def estimate_item(item: Dict) -> float:
    kind = item.get("kind")
    if kind == "exercise":
        return estimate_exercise(item)
    if kind in {"superset", "circuit"}:
        return estimate_cluster(item)
    return 0.0


def estimate_cluster(item: Dict) -> float:
    children = item.get("children", [])
    if not children:
        return 0.0

    rounds = None
    active_per_round = 0.0
    rest_after_round = 0.0

    for idx, child in enumerate(children):
        pres = child.get("prescription", {})
        child_sets = _safe_int(pres.get("sets"))
        if child_sets:
            rounds = child_sets if rounds is None else max(rounds, child_sets)
        rest_after_round = max(rest_after_round, pres.get("restSeconds", 0) or 0)
        active_per_round += estimate_exercise(child, sets_override=1, include_rest=False)

    rounds = rounds or item.get("rounds") or 1
    total = rounds * active_per_round
    if rounds > 1:
        total += (rounds - 1) * rest_after_round
    return total


def estimate_exercise(item: Dict, *, sets_override: int | None = None, include_rest: bool = True) -> float:
    pres = item.get("prescription", {})
    sets = sets_override if sets_override is not None else _safe_int(pres.get("sets"), default=1)
    sets = sets or 1

    active_per_set = compute_active_per_set(pres, item.get("logType"))
    total = active_per_set * sets

    if include_rest:
        rest = pres.get("restSeconds") or 0
        if rest and sets > 1:
            total += rest * (sets - 1)
    return total


def compute_active_per_set(pres: Dict, log_type: str | None) -> float:
    if "estimatedSetSeconds" in pres:
        return float(pres["estimatedSetSeconds"])

    if pres.get("timeSeconds"):
        return float(pres["timeSeconds"])

    hold_seconds = pres.get("holdSeconds")
    if hold_seconds:
        reps = pres.get("reps")
        if isinstance(reps, int):
            return float(hold_seconds) * reps
        return float(hold_seconds)

    distance_miles = pres.get("distanceMiles")
    if distance_miles:
        return float(distance_miles) * PACE_SECONDS_PER_MILE

    distance_meters = pres.get("distanceMeters")
    if distance_meters:
        return float(distance_meters) * PACE_SECONDS_PER_METER

    default = DEFAULT_ACTIVE_SECONDS.get(log_type or "strength", DEFAULT_ACTIVE_SECONDS["strength"])
    return default


def _safe_int(value, default: int = 0) -> int:
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    return default


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Estimate session time for workout JSON files")
    parser.add_argument("paths", nargs="+", help="Workout JSON files or directories")
    main(parser.parse_args().paths)
