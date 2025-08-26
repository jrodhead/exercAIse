Performed logs filename format

- Files are named: <ISO-like timestamp with colons replaced>_<workout base filename>.json
- Example: 2025-08-26T12-30-20.673Z_2-3_Easy_Run_4_Miles.md.json
- The commit action extracts data.workoutFile (or legacy data.file) and uses only the base name for readability.
