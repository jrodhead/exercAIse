---
mode: kai
---
# Apply Dumbbell Ladder Snapping Prompt

When prompted with 'apply dumbbell ladder' or 'snap loads to ladder' for a specific workout session, apply the owner's dumbbell load ladder preferences to minimize plate changes while preserving training intent.

## When to Use
- After generating a workout session with initial load prescriptions
- When you want to optimize dumbbell changes for a specific session or multiple sessions
- To manually review and adjust loads according to ladder preferences
- Before finalizing a workout for execution

## Session Independence
**Each session establishes its own independent ladder** - when applying to multiple sessions (e.g., a full week), each session's ladder is determined by that session's first dumbbell exercise, not carried over from previous sessions.

- **Monday's ladder**: Based on Monday's first dumbbell load
- **Tuesday's ladder**: Based on Tuesday's first dumbbell load (independent of Monday)
- **Wednesday's ladder**: Based on Wednesday's first dumbbell load (independent of prior days)
- And so on...

## Input Required
- Specify the workout file to modify (e.g., `workouts/4-2_Upper_Body_Strength.json`)
- Or provide the workout JSON content directly for analysis

## Dumbbell Load Ladder Rules (from personal instructions)
Apply the owner preference from `.github/instructions/kai.personal.instructions.md`:

### Ladder Determination
1. **For single session**: Identify the first working dumbbell per-hand load in the session (anchor; do not snap the first)
2. **For multiple sessions**: Identify the first working dumbbell per-hand load in EACH session independently - each session gets its own ladder
3. **Establish ladder based on each session's anchor load**:
   - If ends in .5 (e.g., 7.5 or 2.5) → keep fractional anchor with 10 lb steps: 7.5/17.5/27.5/... or 2.5/12.5/22.5/...
   - If ends in 5 (no decimal) → use 5/15/25/35/...
   - Otherwise round the first per-hand load up to nearest 10 → 10/20/30/40/...
4. **Display the determined ladder(s)** for confirmation

### Snapping Rules
- **Snap subsequent dumbbell loads upward** to the nearest rung within each session's ladder
- **Hold prior rung** if snapping up would push RPE over target
- **Session independence**: Do not carry ladder rungs between sessions - each session's subsequent exercises snap only to that session's ladder
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
- If a superset contains two dumbbell movements, evaluate each separately

### Examples
- **Planned**: 3x10 @ 32.5 lb per hand (prior week RPE 7). Ladder snap → 35s. Keep 3x10 if RPE estimate ≤8; otherwise 3x9
- **Planned**: 4x12 @ 40s (RPE 8 last week). Progress intent = +load. Ladder snap → 45s. Adjust to 4x10 (or 1x10 + 3x9) to maintain RPE ≤8
- **Planned**: 3x8 @ 55s incline press (RPE 8.5 last week). Snap would push to 60s. Since prior RPE >8, hold at 55s and keep reps 3x8 (note: "Held load; ladder step deferred")

### Multi-Session Independence Example
**Monday session** (first exercise: 32.5 lb per hand):
- Ladder: 32.5/42.5/52.5/62.5... (fractional anchor)
- All Monday dumbbell exercises snap to this ladder

**Tuesday session** (first exercise: 45 lb per hand):
- Ladder: 45/55/65/75... (5s anchor, independent of Monday)
- All Tuesday dumbbell exercises snap to this ladder

**Wednesday session** (first exercise: 37.5 lb per hand):
- Ladder: 37.5/47.5/57.5/67.5... (fractional anchor, independent of Monday/Tuesday)
- All Wednesday dumbbell exercises snap to this ladder

## Output Format
**For single session:**
1. **Display original workout** with current dumbbell prescriptions
2. **Show determined ladder** based on anchor load
3. **Present recommended changes**:
   - Which loads to snap and to what values
   - Any rep/set adjustments needed to maintain RPE targets
   - Which loads to hold (if snapping would exceed RPE targets)
4. **Ask for confirmation** before applying changes
5. **Update the workout file** with approved modifications
6. **Validate** the updated JSON against schema

**For multiple sessions:**
1. **Display all sessions** with current dumbbell prescriptions
2. **Show determined ladder for each session** based on each session's anchor load
3. **Present recommended changes session by session**:
   - Which loads to snap within each session and to what values
   - Any rep/set adjustments needed within each session
   - Which loads to hold within each session
4. **Ask for confirmation** before applying changes
5. **Update all workout files** with approved modifications
6. **Validate** all updated JSONs against schema

## Workflow Summary
**For single session:**
1. Analyze workout for dumbbell exercises and identify anchor load
2. Determine appropriate ladder (5s, 10s, or fractional)
3. Calculate snaps for all subsequent dumbbell exercises within the session
4. Assess RPE impact and adjust reps/sets as needed
5. Present recommendations with clear rationale
6. Apply approved changes to workout file
7. Validate and confirm completion

**For multiple sessions:**
1. Analyze each session independently for dumbbell exercises and identify each session's anchor load
2. Determine appropriate ladder for each session (5s, 10s, or fractional)
3. Calculate snaps for all subsequent dumbbell exercises within each session to that session's ladder
4. Assess RPE impact and adjust reps/sets as needed within each session
5. Present recommendations session by session with clear rationale
6. Apply approved changes to all workout files
7. Validate all files and confirm completion

## Notes
- This prompt only handles dumbbell load optimization - it doesn't change exercise selection or other prescription elements
- **Session independence**: Each session establishes its own ladder - no cross-session dependencies
- Focus on minimizing plate changes while maintaining training stimulus and safety
- Always preserve the original training intent (RPE targets, volume goals)
- Can be applied to both single sessions and multiple sessions with independent ladder optimization