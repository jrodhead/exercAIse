Performed logs filename format

- Files are named: <ISO-like timestamp with colons replaced>_<workout base filename>.json
- Example: 2025-08-26T12-30-20.673Z_2-3_Easy_Run_4_Miles.md.json
- The commit action extracts data.workoutFile (or legacy data.file) and uses only the base name for readability.

Auto-index on commit

- A pre-commit hook rebuilds the History manifest `performed/index.json` on every commit and stages it automatically.
- If the build fails (e.g., malformed JSON), the commit will be blocked so you can fix issues first.

Manual rebuild

- You can rebuild the manifest manually if needed:
	- Run the local builder (writes `performed/index.json`).
	- Commit `performed/index.json` if it changed.

Disable or skip

- Disable permanently: remove or chmod the hook at `.git/hooks/pre-commit`.
- Skip for one commit: pass the no-verify flag.
