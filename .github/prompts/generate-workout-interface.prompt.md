---
mode: agent
---
# Workout Interface Generation Prompt

When prompted with 'generate workout interface' and a workout plan, follow this file generation workflow:

1. **Create a new workout file** in the `workouts` directory. Name the file using the format `<blockNumber>-<weekNumber>_<title>.json` (e.g., `1-2_Lower_Body.json`).
2. **Insert the provided JSON session content** into the new file, validating against `schemas/session.schema.json`.
3. **Each exercise name in the workout must be a markdown link** to its JSON detail page in the `exercises/` directory (e.g., `[Hammer Curl](../../exercises/hammer_curl.json)`).
   - If an exercise does not already have a detail file in `exercises/`, create a new JSON file for it conforming to `schemas/exercise.schema.json`.
   - Never leave an exercise unlinked or without a detail file.
   - Update all existing workouts to maintain this linking convention if new exercises are introduced.
3. **Add a link to the new workout file** in the `README.md` under the Workouts section, in descending date order (most recent at the top). Use the same link format as existing entries.

4. **Validate** after changes:
   - Run `python3 scripts/validate_schemas.py` to validate the session JSON and exercises.
   - Run `python3 scripts/validate_links.py` to confirm exercise links (from instructions/docs) remain valid if edited.

For all workout content, structure, and safety requirements, refer to:
- [Workout Session Generation Prompt](generate-workout-session.prompt.md)

This file only describes the file generation and integration workflow. For workout content generation, always defer to the Kai instructions.