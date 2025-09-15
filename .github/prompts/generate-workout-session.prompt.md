---
mode: ask
---
# Workout Session Generation Prompt (JSON Output)

When prompted with 'what's the next workout?' or 'generate workout session', provide the workout content based on the user's input, history, and the current block/week focus.

## General Guidelines
- Use the Kai persona in `.github/instructions/kai.instructions.md` to generate the content for a workout.
- Review the owner's personal instructions in `.github/instructions/kai.personal.instructions.md` for any specific adaptations or preferences.
- Review the completed workout history in `workouts/` to ensure consistency and progression.
- Pull prior performed session data from `performed/*.json` to guide today’s prescriptions. Prefer the last 1–3 logs of the same exercise; if none, use the closest similar pattern (e.g., Goblet Squat ≈ Dumbbell Goblet Squat, Neutral-Grip DB Bench ≈ Flat DB Bench).
- Review the block periodization details in `.github/instructions/block-progression.instructions.md` for the current block and week.
- Generate the workout content based on the user's input, history, and the current block/week focus. If user input is not provided, provide the next best option based on the current context and ask for clarification.
- Ensure all exercises are safe and appropriate for the owner's current fitness level and any injury considerations.
- Ensure every exercise item has a `link` to `exercises/<slug>.json`. JSON is the source of truth. If you introduce a new exercise, create `exercises/<slug>.json` conforming to `schemas/exercise.schema.json` (v2 fields).
 - If a referenced exercise JSON exists but lacks v2 fields or is out of date, enrich it to match `schemas/exercise.schema.json` (v2) before finalizing the workout (populate setup, steps, cues, mistakes, safety, scaling, variations, prescriptionHints, joints, media) and validate.
- Structure the JSON into `sections` with consistent `type` values (e.g., Warm-up, Strength/Conditioning, Accessory/Core, Cooldown/Recovery). Avoid generic names like "Plan".
- For each exercise item, include:
  - `name`
  - `link` (to exercises JSON)
  - `logType` to drive the logger UI. Allowed: `"strength" | "endurance" | "carry" | "mobility" | "stretch"`.
    - Warm-up, mobility flows, cool-down stretches → `mobility` or `stretch`
    - Sustained cardio/intervals (run/jog/walk/erg/bike) → `endurance`
    - Loaded carries (farmer/suitcase/rack/march) → `carry`
    - Resistance training and core strength (press/row/squat/hinge/deadbug/Pallof) → `strength`
  - `prescription` with sets/reps/weight/rpe/time/distance as appropriate
  - optional `cues` array (3–5 brief execution cues)
- Clarify whether exercises are performed as straight sets, supersets, or circuits.
- Provide rest time guidance between sets or rounds.
  - Rest conventions (required):
    - Straight sets and supersets: include `restSeconds` on each exercise item (typical: main strength 90–180s; accessory 45–90s; holds/timed core 30–60s).
    - Circuits (3+ moves): do NOT include `restSeconds` on the child exercises. Instead, state round-rest clearly in the section or circuit notes (e.g., "Rest 60–90s between rounds; move briskly between stations").
    - Intervals/conditioning outside circuits: include `restSeconds` with the timed effort if relevant, or add a note clarifying work:rest.
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

### JSON details
- Put sets, reps, rest and weight under `prescription`. Use a string for per-hand notation if needed (e.g., "45 x2 lb"). For circuits, omit `restSeconds` on children and place round-rest guidance in `section.notes`.
 - Include `logType` on every exercise item so the UI renders the correct logging fields.

## Output Format
- Return ONLY a single JSON object conforming to `schemas/session.schema.json`.
- Include fields: `version` ("1"), `title`, optional `date` (YYYY-MM-DD), `block`, `week`, optional `notes`, and `sections`.
  - Ensure each exercise item includes `link`, `logType`, and a `prescription` with `sets`/`reps` (or time/hold/distance), `restSeconds` (if applicable), and `weight` (when load-bearing), using pounds.