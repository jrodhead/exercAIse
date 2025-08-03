---
mode: agent
---

When prompted with 'generate workout:' and a markdown workout plan, follow this file generation workflow:

1. **Create a new workout file** in the `workouts` directory. Name the file using the format `<blockNumber>-<weekNumber>_<title>.md` (e.g., `1-2_Lower_Body.md`).
2. **Insert the provided markdown workout content** into the new file. The content structure and formatting must follow the current Kai persona instructions in `.github/instructions/kai.instructions.md`.
3. **Add a link to the new workout file** in the `README.md` under the Workouts section, in descending date order (most recent at the top). Use the same link format as existing entries.

For all workout content, structure, and safety requirements, refer to:
- [Kai – Strength, Movement & Recovery Coach Instructions](../../.github/instructions/kai.instructions.md)

This file only describes the file generation and integration workflow. For workout content generation, always defer to the Kai instructions.