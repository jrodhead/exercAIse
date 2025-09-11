---
mode: agent
---
# Workout Interface Generation Prompt

When prompted with 'generate workout interface' and a workout plan, follow this file generation workflow:

1. **Create a new workout file** in the `workouts` directory. Name the file using the format `<blockNumber>-<weekNumber>_<title>.json` (e.g., `1-2_Lower_Body.json`).
2. **Insert the provided JSON session content** into the new file, validating against `schemas/session.schema.json`. Ensure each exercise has `link` and `logType`.
3. **Ensure every exercise item in the JSON has a `link` field** pointing to its JSON detail in the `exercises/` directory (e.g., `"exercises/hammer_curl.json"`).
   - If an exercise does not already have a detail file in `exercises/`, create a new JSON file for it conforming to `schemas/exercise.schema.json`.
   - Never leave an exercise without a `link` or without a detail JSON file.
   - When editing Markdown docs (not session JSON), use markdown links to the exercise JSON as usual.
3. **Add a link to the new workout file** in the `README.md` under the Workouts section, in descending date order (most recent at the top). Use the same link format as existing entries.

4. **Validate** after changes:
   - Run `python3 scripts/validate_schemas.py` to validate the session JSON and exercises.
   - Run `python3 scripts/validate_links.py` to confirm exercise links (from instructions/docs) remain valid if edited.

For all workout content, structure, and safety requirements, refer to:
- [Workout Session Generation Prompt](generate-workout-session.prompt.md)

This file only describes the file generation and integration workflow. For workout content generation, always defer to the Kai instructions.