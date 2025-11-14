---
agent: kai
---
# Apply Dumbbell Ladder Snapping Prompt

When prompted with 'apply dumbbell ladder' or 'snap loads to ladder' for a specific workout session, apply the owner's dumbbell load ladder preferences to minimize plate changes **within supersets and circuits only**, while preserving training intent.

## When to Use
- After generating a workout session with initial load prescriptions
- When you want to optimize dumbbell changes within supersets/circuits for a specific session or multiple sessions
- To manually review and adjust loads according to ladder preferences for paired/circuit exercises
- Before finalizing a workout for execution

## Scope: Supersets and Circuits Only
**Only apply ladder snapping to dumbbell exercises that are part of supersets or circuits.** Standalone exercises with standard rest periods (>60s) provide adequate time for plate changes and do not require ladder optimization.

## Superset/Circuit Independence
**Each superset or circuit establishes its own independent ladder** - ladders are NOT shared across supersets/circuits, even within the same session.

- **Superset A**: Ladder based on Superset A's first dumbbell exercise
- **Superset B**: Ladder based on Superset B's first dumbbell exercise (independent of Superset A)
- **Circuit C**: Ladder based on Circuit C's first dumbbell exercise (independent of Supersets A & B)
- And so on...

**Key principle**: Each superset/circuit is a distinct training block with its own weight change constraints. Different supersets may target different muscle groups with different load ranges, so independent ladders preserve optimal training stimulus.

**Note**: If a session has no supersets or circuits with dumbbell exercises, no ladder snapping is applied to that session.

## Input Required
- Specify the workout file to modify (e.g., `workouts/4-2_Upper_Body_Strength.json`)
- Or provide the workout JSON content directly for analysis

## Dumbbell Load Ladder Rules (from personal instructions)
Apply the owner preference from `.github/instructions/kai.personal.instructions.md`:

### Ladder Determination
1. **For each superset/circuit**: Identify the first working dumbbell per-hand load **within that specific superset or circuit** (anchor; do not snap the first exercise in that superset/circuit)
2. **Independent ladders**: Each superset/circuit establishes its own ladder - ladders are NOT shared across different supersets/circuits
3. **Skip standalone exercises**: If an exercise is not part of a superset/circuit, skip ladder application for that exercise
4. **Establish ladder based on each superset/circuit's anchor load** (use only weights listed in the personal instructions) and extend it **both upward and downward** in consistent 10 lb increments so lighter exercises still have nearby rungs:
   - If ends in .5 (e.g., 7.5 or 17.5) → ladder = .../27.5/37.5/47.5/57.5/... (fractional every 10 lb)
   - If ends in 5 (no decimal) → ladder = .../25/35/45/55/... (5 + multiples of 10)
   - Otherwise round the first per-hand load up to nearest 10 → ladder = .../20/30/40/50/...
5. **Display the determined ladder(s)** for each superset/circuit for confirmation

### Snapping Rules
- **Snap only dumbbell exercises within supersets/circuits** to the closest rung within that specific superset/circuit's ladder (whichever option requires the fewest plate changes). Ladders extend **upward and downward**, so if the prescription is lighter than the anchor (e.g., anchor 47.5, target 25) use the lower rungs (37.5 → 27.5) and choose the nearest one. If the load is exactly between two rungs, default upward only when RPE can stay on target.
- **Leave standalone exercises unchanged** - rest periods >60s provide adequate time for plate changes
- **Adjust reps/sets** after snapping so the estimated RPE matches the prescription; when snapping downward, you may add a rep to stay in range, and when snapping upward, trim reps as outlined below.
- **Hold the lower rung** if moving to a higher rung would exceed RPE even after rep adjustments.
- **Superset/circuit independence**: Do not carry ladder rungs between supersets/circuits - each superset/circuit's exercises snap only to that superset/circuit's own ladder
- **Always show per-hand notation** (e.g., "35 lb per hand")

### Adjustment Rules (must apply after snapping)
**Order of operations**: (1) Original reps & sets → (2) Apply ladder snap to load → (3) Adjust reps/sets to preserve target RPE

**If the snap increases per-hand load by**:
- **5 lb (upper body) or 5 lb (lower body accessory)**: allow original reps if prior RPE ≤ 7; else reduce each working set by 1–2 reps to keep RPE ≤ 8
- **10 lb per hand (rare initial jump)**: drop 2 reps from prescribed range (e.g., 10–12 becomes 8–10) OR insert top set at lower reps + back-off sets at original reps - 2

**Safety rules**:
- Never increase both load AND top-end reps in the same week on the same movement
- If adjusted load would still exceed RPE target even after 2–3 rep reduction, hold the previous rung instead
- For straight sets with moderate rep ranges (8–12): prefer rep reduction before cutting a whole set
- For low rep strength work (5–6): prefer holding load rather than reducing to 3–4 reps

**Documentation**:
- Document adjustment intent in `notes` field if reps were altered solely due to ladder snap (e.g., "Reps trimmed 2 due to ladder jump to 50s to keep RPE ≤8")
- If a superset contains two or more dumbbell movements, evaluate each separately

### Comprehensive Example Scenario
Single session containing three supersets/circuits plus a standalone finisher:

**Superset A** – Incline DB Press (anchor) + DB Fly
- Press: 37.5 lb per hand (anchor). Ladder = 37.5/47.5/57.5.
- Fly prescribed at 45 lb → nearest rung is 47.5 (difference 2.5). Snap to 47.5 and trim each set to 3×9 so RPE stays ≤ 8.

**Superset B** – Chest-Supported Row (anchor) + Neutral-Grip Curl (independent ladder)
- Row: 25 lb per hand (anchor). Ladder = 25/35/45/55.
- Curl prescribed at 30 lb → nearest rung is 35 (difference 5). Snap up to 35, adjust to 4×10–11, and note the change.

**Superset C** – Flat DB Bench (anchor) + Lateral Raise (independent ladder)
- Bench: 47.5 lb per hand (anchor). Ladder = .../27.5/37.5/47.5/57.5/...
- Lateral raise prescribed at 25 lb → use the downward rungs of the same ladder. Nearest option is 27.5 (difference 2.5). Snap down to 27.5, add 1 rep per set to keep effort matched, and note the change.

**Circuit D** – Reverse Lunge (anchor) + Standing DB Press + DB Shrug (independent ladder)
- Lunge: 45 lb per hand (anchor). Ladder = 45/55/65.
- Standing press prescribed at 50 lb → closest rung is 45. Snap down to 45 and add 1 rep per round to maintain intent.
- DB shrug prescribed at 65 lb → already on the 65 rung, so leave unchanged.

**Standalone Finisher** – Goblet squat 3×10 @ 35 lb per hand with 90 s rest → **no ladder snap** because rest time allows plate changes.

## Output Format
1. **Present recommended changes per superset/circuit**:
   - Which loads in each superset/circuit to snap and to what values (within that superset/circuit's ladder)
   - Any rep/set adjustments needed to maintain RPE targets
   - Which loads to hold (if snapping would exceed RPE targets)
   - Note that standalone exercises are excluded from snapping
2. **Ask for confirmation** before applying changes
3. **Update the workout file(s)** with approved modifications
4. **Validate** the updated JSON against schema

## Workflow Summary
1. Gather the session(s) to be updated and list every superset or circuit that contains dumbbell work.
2. For each superset/circuit, identify the anchor exercise (first dumbbell prescription) and build its ladder using the rules above.
3. For every other dumbbell movement inside that superset/circuit, snap the planned load to the nearest ladder rung, then adjust reps/sets to maintain the intended RPE.
4. Document decisions (e.g., "Stayed at 50s due to tie and triceps fatigue") and keep standalone exercises unchanged because their rest windows allow plate swaps.
5. Summarize recommendations per superset/circuit, obtain confirmation, apply the edits to the relevant workout file(s), and validate the JSON schema.

## Notes
- This prompt only handles dumbbell load optimization within supersets and circuits - it doesn't change exercise selection or other prescription elements
- **Supersets/circuits only**: Standalone exercises with >60s rest provide adequate time for plate changes and are excluded
- **Superset/circuit independence**: Each superset or circuit establishes its own ladder - no cross-superset/circuit dependencies (even within the same session)
- Focus on minimizing plate changes during rapid transitions while maintaining training stimulus and safety
- Always preserve the original training intent (RPE targets, volume goals)
- Can be applied to both single sessions and multiple sessions with independent ladder optimization per superset/circuit