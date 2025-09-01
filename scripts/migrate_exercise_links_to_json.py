#!/usr/bin/env python3
"""
Migrate exercise links in Markdown from .md to .json across workouts/ and README.md.

Safety: Only rewrites a link if the corresponding exercises/<slug>.json exists.

Usage:
  python3 scripts/migrate_exercise_links_to_json.py
"""
from __future__ import annotations
import re
from pathlib import Path

RE_MD_LINK = re.compile(r"\[(?P<text>[^\]]+)\]\((?P<href>[^)]+)\)")

def is_exercise_md_href(href: str) -> bool:
    # Match ../exercises/slug.md, ../../exercises/slug.md, exercises/slug.md
    return bool(re.search(r"(?:^|/)exercises/[\w\-]+\.md$", href))

def to_json_href(href: str) -> str:
    return href[:-3] + ".json" if href.endswith(".md") else href

def target_json_exists(md_file: Path, href: str, repo_root: Path) -> bool:
    # Resolve the target relative to the markdown file
    target_md = (md_file.parent / href).resolve()
    # Find slug and construct exercises/<slug>.json under repo_root
    m = re.search(r"exercises/([\w\-]+)\.md$", href)
    if not m:
        return False
    slug = m.group(1)
    json_path = repo_root / "exercises" / f"{slug}.json"
    return json_path.exists()

def process_file(path: Path, repo_root: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    changed = False

    def repl(m: re.Match[str]) -> str:
        nonlocal changed
        text_inner = m.group("text")
        href = m.group("href")
        if is_exercise_md_href(href) and target_json_exists(path, href, repo_root):
            new_href = to_json_href(href)
            if new_href != href:
                changed = True
                return f"[{text_inner}]({new_href})"
        return m.group(0)

    new_text = RE_MD_LINK.sub(repl, text)
    if changed:
        path.write_text(new_text, encoding="utf-8")
    return changed

def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    candidates = [repo_root / "README.md"]
    if (repo_root / "workouts").is_dir():
        candidates.extend(sorted((repo_root / "workouts").rglob("*.md")))

    total = 0
    for f in candidates:
        if not f.is_file():
            continue
        if process_file(f, repo_root):
            total += 1

    print(f"Migration complete. Files updated: {total}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
