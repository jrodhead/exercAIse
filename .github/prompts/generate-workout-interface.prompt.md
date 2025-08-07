---
mode: agent
---
# Workout Interface Generation Prompt

When prompted with 'generate workout interface' and a workout plan, follow this file generation workflow:

1. **Create a new workout file** in the `workouts` directory. Name the file using the format `<blockNumber>-<weekNumber>_<title>.md` (e.g., `1-2_Lower_Body.md`).
2. **Insert the provided markdown workout content** into the new file.
3. **Each exercise name in the workout must be a markdown link** to its detail page in the `exercises/` directory (e.g., `[Hammer Curl](../exercises/hammer_curl.md)`).
   - If an exercise does not already have a detail file in `exercises/`, create a new markdown file for it, following the format and detail level of existing exercise files.
   - Never leave an exercise unlinked or without a detail file.
   - Update all existing workouts to maintain this linking convention if new exercises are introduced.
3. **Add a link to the new workout file** in the `README.md` under the Workouts section, in descending date order (most recent at the top). Use the same link format as existing entries.

For all workout content, structure, and safety requirements, refer to:
- [Workout Plan Generation Prompt](generate-workout.prompt.md)

This file only describes the file generation and integration workflow. For workout content generation, always defer to the Kai instructions.