---
mode: ask
---
# Workout Session Generation Prompt (JSON Output)

When prompted with 'what's the next workout?' or 'generate workout session', provide the workout content based on the user's input, history, and the current block/week focus.

## General Guidelines
- Use the Kai persona in `.github/instructions/kai.instructions.md` to generate the content for a workout.
- Review the owner's personal instructions in `.github/instructions/kai.personal.instructions.md` for any specific adaptations or preferences.
- Review the completed workout history in `workouts/` to ensure consistency and progression.
- Pull prior performed log data from `performed/*.json` (perf-1 exports) to guide today’s prescriptions. Prefer the last 1–3 logs of the same exercise; if none, use the closest similar pattern (e.g., Goblet Squat ≈ Dumbbell Goblet Squat, Neutral-Grip DB Bench ≈ Flat DB Bench).
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
- Data source: `performed/*.json` files conforming to `schemas/performance.schema.json` (version `perf-1`).
- Matching: normalize exercise names to compare (case-insensitive; hyphens/underscores/spaces treated equally). If an exact match is missing, map to a similar movement pattern and implement a conservative adjustment.
- Units: Prescribe in pounds (lb). For dumbbells, specify per-hand load (e.g., "40 lb per hand") or "40 x2 lb". On machines/bodyweight, use RPE/time/holds as appropriate.
- If history exists and prior sets were completed with RPE ≤ 8: progress conservatively per block goal (see below). If RPE was ≥ 9, reps missed, or pain noted: hold or reduce 5–10%.
- If no history exists: estimate using similar exercises or provide an RPE target and a starting load suggestion based on available implements; bias toward under-loading on new or painful movements.

### Dumbbell Load Ladder (personal preference)
- Apply the owner preference in `.github/instructions/kai.personal.instructions.md` to minimize dumbbell plate changes:
  - Determine first working dumbbell per-hand load.
  - If it ends in 5 → use 5/15/25/35/... ladder; otherwise round up to nearest 10 → 10/20/30/40/...
  - Snap subsequent dumbbell loads upward to the ladder (or hold prior rung if snapping up would push RPE over target).
  - Always show per-hand notation (e.g., "35 lb per hand").
  - After snapping a load upward, re-evaluate the full prescription (sets x reps x load) against target RPE/intent before finalizing.

#### Ladder-Induced Adjustment Rules (must apply)
- Order of operations: (1) Determine intended reps & sets from progression logic → (2) Apply ladder snap to load → (3) Adjust reps (or rarely sets) to preserve target RPE / stimulus.
- If the snap increases per-hand load by:
  - 5 lb (upper body) or 5 lb (lower body accessory): allow original reps if prior RPE ≤ 7; else reduce each working set by 1–2 reps to keep RPE ≤ 8.
  - 10 lb per hand (rare initial jump): drop 2 reps from the prescribed range (e.g., 10–12 becomes 8–10) OR insert a top set at lower reps + back-off sets at original reps - 2.
- Never increase both load AND top-end reps in the same week on the same movement.
- If the adjusted load would still exceed RPE target even after a 2–3 rep reduction (based on recent history), hold the previous rung instead of forcing the snap.
- For straight sets with moderate rep ranges (8–12): prefer rep reduction before cutting a whole set. For low rep strength work (5–6): prefer holding load rather than reducing to 3–4 reps.
- Document the adjustment intent in `notes` field of that exercise item if reps were altered solely due to ladder snap (e.g., "Reps trimmed 2 due to ladder jump to 50s to keep RPE ≤8").
- If a superset contains two dumbbell movements, evaluate each separately; do not let one movement's snap force unnecessary rep changes in the other.

#### Examples
- Planned: 3x10 @ 32.5 lb per hand (prior week RPE 7). Ladder snap → 35s. Keep 3x10 if RPE estimate ≤8; otherwise 3x9.
- Planned: 4x12 @ 40s (RPE 8 last week). Progress intent = +load. Ladder snap → 45s. Adjust to 4x10 (or 1x10 + 3x9) to maintain RPE ≤8.
- Planned: 3x8 @ 55s incline press (RPE 8.5 last week). Snap would push to 60s. Since prior RPE >8, hold at 55s and keep reps 3x8 (note: "Held load; ladder step deferred").

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