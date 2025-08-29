---
mode: ask
---
# Workout Session Generation Prompt

When prompted with 'what's the next workout?' or 'generate workout session', provide the workout content based on the user's input, history, and the current block/week focus.

## General Guidelines
- Use the Kai persona in `.github/instructions/kai.instructions.md` to generate the content for a workout.
- Review the owner's personal instructions in `.github/instructions/kai.personal.instructions.md` for any specific adaptations or preferences.
- Review the completed workout history in `workouts/` to ensure consistency and progression.
- Pull prior performed session data from `performed/*.json` to guide today’s prescriptions. Prefer the last 1–3 logs of the same exercise; if none, use the closest similar pattern (e.g., Goblet Squat ≈ Dumbbell Goblet Squat, Neutral-Grip DB Bench ≈ Flat DB Bench).
- Review the block periodization details in `.github/instructions/block-progression.instructions.md` for the current block and week.
- Generate the workout content based on the user's input, history, and the current block/week focus. If user input is not provided, provide the next best option based on the current context and ask for clarification.
- Ensure all exercises are safe and appropriate for the owner's current fitness level and any injury considerations.
- Link every exercise name to `../exercises/<slug>.json`. JSON is the source of truth. If you introduce a new exercise, create `exercises/<slug>.json` conforming to `schemas/exercise.schema.json` (v2 fields).
 - If a referenced exercise JSON exists but lacks v2 fields or is out of date, enrich it to match `schemas/exercise.schema.json` (v2) before finalizing the workout (populate setup, steps, cues, mistakes, safety, scaling, variations, prescriptionHints, joints, media) and validate.
- Use structured Markdown with clear sections: warm-up, main workout, optional finisher, and cooldown/mobility.
 - Use structured Markdown with standard section headers (exact text):
   - "Warm-up"
   - "Main Work" (or "Strength"/"Conditioning" as appropriate)
   - "Accessory/Core" (if used)
   - "Cooldown/Recovery"
   - Do not use a generic "Plan" section. Running/conditioning days must still use the same headers (Warm-up, Conditioning (Main Work), Accessory/Core, Cooldown/Recovery).
- For each exercise, include:
  - Exercise/Pose Name
  - Sets/Reps or Hold Time
  - Rest (if applicable)
  - Suggested Weight in pounds (if applicable), based on performed history and current block/week focus
  - 3–5 bullet-point execution cues
- Clarify whether exercises are performed as straight sets, supersets, or circuits.
- Provide rest time guidance between sets or rounds.
- Begin each workout with a warm-up (mobility/activation).
- For strength: include a finisher or accessory work if applicable.
- For conditioning: include a main circuit with intervals or timed sets.
- For recovery/mobility: provide a structured flow with poses and hold times.
- End with a short cooldown/mobility sequence.
- Clearly state any specific instructions, safety notes, or modifications for injuries/limitations.
- Ensure compatibility with available equipment and block periodization principles.
- Reference owner-specific instructions in `.github/instructions/kai.personal.instructions.md` for:
  - Injury/pain status
  - Equipment available
  - Weekly schedule/periodization
  - Personal adaptations/preferences
- Follow the block periodization details, see `.github/instructions/block-progression.instructions.md`.
- For sample structure, see `.github/instructions/sample-workout.instructions.md`.

### History-driven prescriptions (required)
- Data source: `performed/*.json` files conforming to `schemas/performed.schema.json`.
- Matching: normalize exercise names to compare (case-insensitive; hyphens/underscores/spaces treated equally). If an exact match is missing, map to a similar movement pattern and implement a conservative adjustment.
- Units: Prescribe in pounds (lb). For dumbbells, specify per-hand load (e.g., "40 lb per hand") or "40 x2 lb". On machines/bodyweight, use RPE/time/holds as appropriate.
- If history exists and prior sets were completed with RPE ≤ 8: progress conservatively per block goal (see below). If RPE was ≥ 9, reps missed, or pain noted: hold or reduce 5–10%.
- If no history exists: estimate using similar exercises or provide an RPE target and a starting load suggestion based on available implements; bias toward under-loading on new or painful movements.

### Block-aware progression heuristics (guidance)
- Strength (main lifts):
  - Upper body DB/barbell patterns: +2.5–5 lb week-over-week when prior work was completed at RPE ≤ 8.
  - Lower body patterns: +5–10 lb week-over-week under same conditions.
  - If transitioning rep range (e.g., from 10s to 6–8): keep last week’s load and hit lower reps before increasing.
- Hypertrophy/Accessory:
  - Keep load and add 1–2 reps per set up to the rep cap; or bump 2.5–5 lb if all sets were at the top of the range and RPE ≤ 8.
- Conditioning/Carries:
  - Progress time or distance first; increase load by 5 lb per hand if prior RPE < 7 and posture stayed clean.
- Deload weeks:
  - Reduce volume (sets) by 30–50% and/or load by 10–20%; keep movements crisp and pain-free.

### Presentation rules
- In Markdown, place sets, reps, rest, and weight together for each movement (e.g., "4 x 8 @ 45 x2 lb, Rest 90 sec").
- In the final JSON, include the weight value in the `prescription.weight` field. Use a string for per-hand notation (e.g., "45 x2 lb").

## Output Format
- All workouts must be in Markdown for easy logging.
- Use bullet points and clear section headers.
- Date must be included at the top in bold (e.g., `**Date:** July 29, 2025`).
- File naming, README update, and integration are handled separately.
 - Append a final fenced JSON block that represents the session structure and prescriptions, conforming to `schemas/session.schema.json`. Use a fence like:
   ```json session-structure
   { ... }
   ```
   This block is used by the logger to prefill values and by validators.
  - Ensure each exercise item’s `prescription` includes `sets`, `reps` (or time/hold), `restSeconds` (if applicable), and `weight` (when load-bearing), using pounds.