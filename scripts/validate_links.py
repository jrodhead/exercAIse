#!/usr/bin/env python3
"""
Markdown link validator for exercAIse.
- Scans README.md and all .md files under workouts/ and exercises/.
- Validates that relative links resolve to existing files.
- Ignores external links (http/https/mailto) and in-page anchors (#...).
- Exits with code 1 if any broken links are found; prints a summary.

Usage:
  python3 scripts/validate_links.py
"""
from __future__ import annotations
import re
import sys
from pathlib import Path
from typing import List, Tuple

LINK_PATTERN = re.compile(r"!?(?P<all>\[(?P<text>[^\]]+)\]\((?P<href>[^)]+)\))")


def is_external(href: str) -> bool:
    href = href.strip()
    return (
        href.startswith("http://")
        or href.startswith("https://")
        or href.startswith("mailto:")
        or href.startswith("#")
    )


def find_markdown_files(root: Path) -> List[Path]:
    files: List[Path] = []
    candidates = [root / "README.md", root / "workouts", root / "exercises", root / ".github"]
    for c in candidates:
        if c.is_file():
            files.append(c)
        elif c.is_dir():
            files.extend([p for p in c.rglob("*.md") if p.is_file()])
    return files


def validate_file(file_path: Path, repo_root: Path) -> List[Tuple[int, str, str]]:
    """
    Returns list of (line_number, href, error_message) for broken links in a file.
    """
    problems: List[Tuple[int, str, str]] = []
    try:
        text = file_path.read_text(encoding="utf-8")
    except Exception as e:
        problems.append((0, str(file_path), f"cannot read file: {e}"))
        return problems

    for i, line in enumerate(text.splitlines(), start=1):
        for m in LINK_PATTERN.finditer(line):
            href = m.group("href").strip()
            if is_external(href):
                continue
            # Resolve relative to the file's directory
            target = (file_path.parent / href).resolve()
            # Ensure target stays within repo
            try:
                in_repo = str(target).startswith(str(repo_root.resolve()))
            except Exception:
                in_repo = False
            if not in_repo:
                problems.append((i, href, "link resolves outside repository"))
                continue
            if not target.exists():
                problems.append((i, href, "target does not exist"))
    return problems


def main() -> int:
    script_path = Path(__file__).resolve()
    repo_root = script_path.parents[1]
    md_files = find_markdown_files(repo_root)
    all_problems: List[Tuple[Path, List[Tuple[int, str, str]]]] = []

    for md in sorted(md_files):
        probs = validate_file(md, repo_root)
        if probs:
            all_problems.append((md, probs))

    if not all_problems:
        print("Markdown link check: OK (no broken links found)")
        return 0

    print("Markdown link check: BROKEN LINKS FOUND\n")
    for path, probs in all_problems:
        rel = path.relative_to(repo_root)
        print(f"- {rel}")
        for (ln, href, msg) in probs:
            print(f"  L{ln}: {href} -> {msg}")
        print()
    return 1


if __name__ == "__main__":
    sys.exit(main())
