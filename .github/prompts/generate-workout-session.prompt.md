---
mode: kai
---
# Complete Workout Generation Prompt (JSON + File Creation)

When prompted with workout generation requests, provide the workout content AND create the necessary files based on the user's input, history, and the current block/week focus.

## Supported Request Types
- **Single session**: "What's the next workout?" or "Generate [day] workout for Block X, Week Y"
- **Full week**: "Generate this week" or "Create Block X, Week Y full week" or "Generate weekly plan for Block X, Week Y"

## General Guidelines
- Use the Kai persona in `.github/instructions/kai.instructions.md` to generate the content for a workout.
- Review the owner's personal instructions in `.github/instructions/kai.personal.instructions.md` for any specific adaptations or preferences.
- Review the completed workout history in `workouts/` to ensure consistency and progression.
- Pull prior performed log data from `performed/*.json` (perf-1 exports) to guide today’s prescriptions. Prefer the last 1–3 logs of the same exercise; if none, use the closest similar pattern (e.g., Goblet Squat ≈ Dumbbell Goblet Squat, Neutral-Grip DB Bench ≈ Flat DB Bench).
- Review the block periodization details in `.github/instructions/block-progression.instructions.md` for the current block and week.
- Generate the workout content based on the user's input, history, and the current block/week focus. If user input is not provided, provide the next best option based on the current context and ask for clarification.
- **For weekly requests**: Generate all sessions for the week following the owner's weekly schedule in `.github/instructions/kai.personal.instructions.md`
- Ensure all exercises are safe and appropriate for the owner's current fitness level and any injury considerations.
- **Exercise selection balance**: Maintain consistency in main movement patterns for progression tracking, while introducing appropriate variety in accessory work, warm-ups, and cooldowns to address weaknesses, prevent staleness, and enhance movement quality.
- Ensure every exercise item has a `link` to `exercises/<slug>.json`. JSON is the source of truth. If you introduce a new exercise, create `exercises/<slug>.json` conforming to `schemas/exercise.schema.json` (v2 fields).
 - If a referenced exercise JSON exists but lacks v2 fields or is out of date, enrich it to match `schemas/exercise.schema.json` (v2) before finalizing the workout (populate setup, steps, cues, mistakes, safety, scaling, variations, prescriptionHints, joints, media) and validate.
- Structure the JSON into `sections` with consistent `type` values (e.g., Warm-up, Strength/Conditioning, Accessory/Core, Cooldown/Recovery). Avoid generic names like "Plan".
- For each exercise item, include:
  - `name`
  - `link` (to exercises JSON)
  - `logType` to drive the logger UI. **Must be one of**: `"strength" | "endurance" | "carry" | "mobility" | "stretch"`.
    - Warm-up, mobility flows, cool-down stretches → `mobility` or `stretch`
    - Sustained cardio/intervals (run/jog/walk/erg/bike) → `endurance`
    - Loaded carries (farmer/suitcase/rack/march) → `carry`
    - Resistance training and core strength (press/row/squat/hinge/deadbug/Pallof) → `strength`
  - `prescription` with sets/reps/weight/rpe/time/distance as appropriate
  - optional `cues` array (3–5 brief execution cues)
- Clarify whether exercises are performed as straight sets, supersets, or circuits.
- Provide rest time guidance between sets or rounds.
  - Rest conventions (required):
    - Straight sets: include `restSeconds` on each exercise item (typical: main strength 90–180s; accessory 45–90s; holds/timed core 30–60s).
    - Supersets: include `restSeconds` ONLY on the LAST exercise in the superset (rest occurs after completing all exercises in the round). Add a `notes` field to the superset item explaining execution (e.g., "Perform both exercises back-to-back, then rest 90s before next round").
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

### History-driven prescriptions (required)
- Data source: `performed/*.json` files conforming to `schemas/performance.schema.json` (version `perf-1`).
- Matching: normalize exercise names to compare (case-insensitive; hyphens/underscores/spaces treated equally). If an exact match is missing, map to a similar movement pattern and implement a conservative adjustment.
- **Progression continuity**: For main movement patterns (primary squats, presses, rows, hinges), prefer consistent exercise selection across weeks to track progression effectively.
- **Appropriate variety**: For accessory work, warm-ups, and cooldowns, introduce variety when it serves training goals, addresses weaknesses, or prevents staleness—while still referencing similar movement history for load guidance.
- Units: Prescribe in pounds (lb). For dumbbells, specify per-hand load (e.g., "40 lb per hand") or "40 x2 lb". On machines/bodyweight, use RPE/time/holds as appropriate.
- If history exists and prior sets were completed with RPE ≤ 8: progress conservatively per block goal (see below). If RPE was ≥ 9, reps missed, or pain noted: hold or reduce 5–10%.
- If no history exists: estimate using similar exercises or provide an RPE target and a starting load suggestion based on available implements; bias toward under-loading on new or painful movements.

### Dumbbell Load Prescriptions
- Always specify per-hand load (e.g., "40 lb per hand") or "40 x2 lb" notation for clarity
- Base loads on progression logic and performance history without automatic ladder snapping
- **Note**: Dumbbell loads can be optimized later using the separate "Apply Dumbbell Ladder" prompt for minimal plate changes

### Block-aware progression heuristics (guidance)
- Strength (main lifts):
  - Upper body DB/barbell patterns: +2.5–5 lb week-over-week when prior work was completed at RPE ≤ 8.
  - Lower body patterns: +5–10 lb week-over-week under same conditions.
  - If transitioning rep range (e.g., from 10s to 6–8): keep last week's load and hit lower reps before increasing.
- Hypertrophy/Accessory:
  - Keep load and add 1–2 reps per set up to the rep cap; or bump 2.5–5 lb if all sets were at the top of the range and RPE ≤ 8.
- Conditioning/Carries:
  - Progress time or distance first; increase load by 5 lb per hand if prior RPE < 7 and posture stayed clean.
- Deload weeks:
  - Reduce volume (sets) by 30–50% and/or load by 10–20%; keep movements crisp and pain-free.

### Exercise variety guidelines
- **Maintain consistency for**: Primary movement patterns within a block (main squats, presses, rows, hinges) to enable clear progression tracking
- **Introduce variety for**: 
  - Accessory exercises to address different angles, grip positions, or movement planes
  - Warm-up movements to target different activation patterns or address specific restrictions
  - Cooldown stretches to address session-specific tightness or provide novel mobility work
  - Conditioning exercises to prevent staleness and challenge different energy systems
- **When adding variety**: Always create the corresponding exercise JSON file and ensure load guidance comes from similar movement patterns in the performance history

### JSON details
- Put sets, reps, rest and weight under `prescription`. Use a string for per-hand notation if needed (e.g., "45 x2 lb"). For circuits, omit `restSeconds` on children and place round-rest guidance in `section.notes`.
- Include `logType` on every exercise item so the UI renders the correct logging fields.
- **Critical structure requirements**:
  - Use `items` arrays within sections, NOT `exercises`
  - Each exercise item must include `kind: "exercise"` 
  - No `metadata` wrapper - all fields go at top level
  - Required top-level fields: `version`, `title`, `block`, `week`, `sections`
  - Optional top-level fields: `date`, `notes`

## Output Format
**For single sessions:**
- Return ONLY a single JSON object conforming to `schemas/session.schema.json`.
- Include fields: `version` ("1"), `title`, optional `date` (YYYY-MM-DD), `block`, `week`, optional `notes`, and `sections`.
- Ensure each exercise item includes `kind`, `name`, `link`, `logType`, and a `prescription` with `sets`/`reps` (or time/hold/distance), `restSeconds` (if applicable), and `weight` (when load-bearing), using pounds.
- Validate the final JSON against `schemas/session.schema.json` before returning.

**Example structure:**
```json
{
  "version": "1",
  "title": "Upper Body Strength",
  "date": "2024-10-22", 
  "block": 4,
  "week": 3,
  "sections": [
    {
      "type": "Warm-up",
      "title": "Activation",
      "items": [
        {
          "kind": "exercise",
          "name": "Arm Circles", 
          "link": "exercises/arm_circles.json",
          "logType": "mobility",
          "prescription": { "sets": 1, "reps": "10 each direction" }
        }
      ]
    }
  ]
}
```

**For weekly plans:**
- Generate 5 separate JSON objects (Monday through Friday) each conforming to `schemas/session.schema.json`.
- Ensure progression consistency across the week and proper periodization within the block structure.
- Each session should include all required fields and validate against the schema.

## File Creation & Integration Workflow
After generating the workout content JSON(s), immediately proceed with file creation:

**For single sessions:**
1. **Create the workout file** in `workouts/` directory using format `<blockNumber>-<weekNumber>_<title>.json` (e.g., `4-2_Lower_Body_Strength_Mobility.json`).
2. **Insert the JSON content** into the new file, ensuring each exercise has `link` and `logType` fields.
3. **Create missing exercise files**: For any exercise without an existing JSON file in `exercises/`, create `exercises/<slug>.json` conforming to `schemas/exercise.schema.json` (v2 fields: setup, steps, cues, mistakes, safety, scaling, variations, prescriptionHints, joints, media).
4. **Validate everything**: Run validation scripts to ensure schema compliance and link integrity. The workout manifest is automatically updated by git hooks or CI/CD.

**For weekly plans:**
1. **Create 5 workout files** in `workouts/` directory using format `<blockNumber>-<weekNumber>_<DayTitle>.json` (e.g., `4-2_Monday_Basketball_Conditioning.json`, `4-2_Tuesday_Upper_Body_Strength.json`, etc.).
2. **Insert each JSON content** into its respective file, ensuring all exercises have `link` and `logType` fields.
3. **Create all missing exercise files**: Collect all unique exercises from all 5 sessions and create any missing `exercises/<slug>.json` files conforming to the schema.
4. **Validate everything**: Run validation scripts to ensure all schemas comply and link integrity is maintained across all files. The workout manifest is automatically updated by git hooks or CI/CD.

## Complete Workflow Summary
**For single sessions:**
1. Generate JSON workout content following all guidelines above
2. Create workout file with proper naming convention
3. Create any missing exercise JSON files
4. Validate schemas and links (manifest auto-updates via git hooks/CI)
5. Confirm completion to user

**For weekly plans:**
1. Generate 5 JSON workout sessions following all guidelines above
2. Create all 5 workout files with proper naming conventions
3. Create any missing exercise JSON files for all sessions
4. Validate all schemas and links (manifest auto-updates via git hooks/CI)
5. Provide summary of the week's training focus and confirm completion

## Weekly Planning Considerations
When generating full weeks:
- **Ensure progression consistency** across similar movement patterns throughout the week
- **Balance training stress** - avoid overlapping high-intensity sessions
- **Respect recovery needs** - recovery sessions should complement training days
- **Coordinate equipment usage** - distribute dumbbell-heavy sessions appropriately; ladder optimization can be applied separately if desired
- **Consider cumulative fatigue** - conditioning sessions should account for prior training load