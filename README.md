# exercAIse

AI-generated workouts compatible with a really old iPad

## This Week

- [Foot Rehab – Lateral Right Foot (Tuesday)](workouts/3-2_Foot_Rehab_Lateral_Right_Foot.json)
- [Upper Body Hypertrophy – Block 3, Week 2 (Tuesday)](workouts/3-2_Upper_Body_Hypertrophy.json)
- [Yin Yoga Recovery Flow – Block 3, Week 2 (Wednesday)](workouts/3-2_Yin_Yoga_Recovery_Flow.json)
- [Lower Body Strength & Calves – Block 3, Week 2 (Thursday)](workouts/3-2_Lower_Body_Strength_Calves.json)
- [Arms Volume & Pump – Block 3, Week 2 (Friday)](workouts/3-2_Arms_Volume_Pump.json)

## Archive

- [Yin Yoga Recovery Flow – Block 3, Week 2 (Wednesday)](workouts/3-2_Yin_Yoga_Recovery_Flow.json)
- [Yin Yoga Recovery Flow – Block 3, Week 1 (Sunday)](workouts/3-1_Yin_Yoga_Recovery_Flow.json)
- [Full-Body Conditioning & Core – Block 3, Week 1 (Friday)](workouts/3-1_Full_Body_Conditioning_Core.json)
- [Lower Body Strength & Mobility – Block 3, Week 1 (Thursday)](workouts/3-1_Lower_Body_Strength_Mobility.json)
- [Upper Body Strength & Mobility – Block 3, Week 1 (Tuesday)](workouts/3-1_Upper_Body_Strength_Mobility.json)
- [Easy Run – 4 Miles – Block 3, Week 1 (Monday)](workouts/3-1_Easy_Run_4_Miles.json)
- [Full-Body Conditioning & Core – Block 2, Week 4 (Deload)](workouts/2-4_Full_Body_Conditioning_Core.json)
- [Yin Yoga Recovery Flow – Block 2, Week 4 (Deload)](workouts/2-4_Yin_Yoga_Recovery_Flow.json)
- [Easy Run – 3 Miles – Block 2, Week 4 (Deload)](workouts/2-4_Easy_Run_4_Miles.json)
- [Lower Body Strength & Mobility – Block 2, Week 4 (Deload)](workouts/2-4_Lower_Body_Strength_Mobility.json)
- [Upper Body Strength & Mobility – Block 2, Week 4 (Deload)](workouts/2-4_Upper_Body_Strength_Mobility.json)
- [Full-Body Conditioning & Core – Block 2, Week 3](workouts/2-3_Full_Body_Conditioning_Core.json)
- [Yin Yoga Recovery Flow – Block 2, Week 3](workouts/2-3_Yin_Yoga_Recovery_Flow.json)
- [Lower Body Strength & Mobility – Block 2, Week 3](workouts/2-3_Lower_Body_Strength_Mobility.json)
- [Easy Run – 4 Miles – Block 2, Week 3](workouts/2-3_Easy_Run_4_Miles.json)
- [Upper Body Strength & Mobility – Block 2, Week 3](workouts/2-3_Upper_Body_Strength_Mobility.json)
- [Full-Body Conditioning & Core – Block 2, Week 2](workouts/2-2_Full_Body_Conditioning_Core.json)
- [Yin Yoga Recovery Flow – Block 2, Week 2](workouts/2-2_Yin_Yoga_Recovery_Flow.json)
- [Lower Body Strength & Mobility – Block 2, Week 2](workouts/2-2_Lower_Body_Strength_Mobility.json)
- [Easy Run – 4 Miles – Block 2, Week 2](workouts/2-2_Easy_Run_4_Miles.json)
- [Upper Body Strength & Mobility – Block 2, Week 2](workouts/2-2_Upper_Body_Strength_Mobility.json)
- [Full-Body Conditioning & Core – Block 2, Week 1](workouts/2-1_Full_Body_Conditioning_Core.json)
- [Lower Body Strength & Mobility – Block 2, Week 1](workouts/2-1_Lower_Body_Strength_Mobility.json)
- [Upper Body Strength & Mobility – Block 2, Week 1](workouts/2-1_Upper_Body_Strength_Mobility.json)
- [Lower Body & Mobility – Block 1, Week 4 (Deload)](workouts/1-4_Lower_Body_Mobility_Deload.json)
- [Upper Body Strength – Block 1, Week 4 (Deload)](workouts/1-4_Upper_Body_Strength_Deload.json)
- [Basketball Warm-Up & Cooldown](workouts/basketball_warmup_cooldown.json)
- [Full-Body Endurance / Conditioning – Block 1, Week 3 (Adjusted)](workouts/1-3_Full_Body_Endurance_Conditioning_Adjusted.json)
- [Lower Body Strength – Block 1, Week 3](workouts/1-3_Lower_Body_Strength.json)
- [Yin Yoga Recovery Flow – Rest Day](workouts/1-3_recovery_Yin_Yoga_Rest_Day.json)
- [Upper Body Strength – Block 1, Week 3](workouts/1-3_Upper_Body_Strength.json)
- [Upper Body Strength – Block 1, Week 2 (Modified)](workouts/1-2_Upper_Body_Strength_Modified.json)
- [Biceps, Triceps & Core Workout - Block 1, Week 2](workouts/1-2_Biceps_Triceps_Core_Workout.json)
- [Lower Body Strength – Block 1, Week 2](workouts/1-2_Lower_Body.json)
- [Mock Session](workouts/mock_All_Types_Test.json)

## Instructions
- [Kai – Strength, Movement & Recovery Coach](.github/instructions/kai.instructions.md)

## Validation
- Validate links: run the VS Code task “Validate Markdown Links” or `python3 scripts/validate_links.py`.
- Validate schemas: run the task “Validate Schemas” or `python3 scripts/validate_schemas.py`.
- CI: GitHub Actions runs both validators on pushes and PRs.

## Schemas
- `schemas/session.schema.json`: Canonical committed workout session files in `workouts/`.
- `schemas/exercise.schema.json`: Source of truth for exercise detail files in `exercises/`.
- `schemas/performance.schema.json`: Export format (`perf-1`) produced by the logger UI.
- Legacy (historical only): `performed.schema.json` (older performed logs); no longer exported by the app.

Deprecated schemas removed: session_plan, session_v1, session_log (superseded by unified session + perf-1 export).

## Conventions
- Dumbbell weights: log as number or string. Examples: `25` (per hand implied), `"25 x2"` (explicit per hand), `"50 total"`.
- Movements without sets/weights: use time/hold/distance fields (e.g., `timeSeconds`, `holdSeconds`, `distanceMiles`; `distanceMeters` is supported for legacy files).
- Supersets vs circuits: both are supported; supersets typically pair 2 movements back-to-back, circuits are 3+ movements. In JSON (if used), `kind: "superset" | "circuit"` with `children` items.

### Dumbbell Ladder Personalization
- First encountered dumbbell load in a generated session establishes that session's ladder anchor (no snap on first load).
- Subsequent dumbbell loads are normalized upward to the nearest valid rung (5 lb spacing anchored to initial offset) to create predictable increments.
- If a prescribed load would jump multiple rungs, reps may be auto-reduced per Kai's ladder-induced adjustment rules.
- UI does not mutate loads post-generation; enforcement occurs in the generation backend for transparency.

### Offline (PWA) Minimal Support
- Basic app shell (index, assets, exercises, workouts JSON) cached by `sw.js` for offline viewing & logging continuity.
- Network-first strategy for generation API; falls back gracefully if offline (local deterministic generation still available).
- Icons currently placeholder (manifest `icons` array empty) — future enhancement before public release.

## Generate
- Form: open `index.html`, use the "Generate Session" form (goals, pain, equipment, optional instructions) or paste a `SessionPlan` JSON.
- API: client posts to `POST /api/kai/session-plan` (local server mock via `scripts/serve.py`).
- Validation: client hard-fails if the plan schema is invalid or if any exercise slug lacks a matching file in `exercises/<slug>.json`.
- Fallback: if the API call fails, a local deterministic plan is generated and validated with the same guardrails.

## Roadmap (Coach Intelligence – Upcoming)
- History-based load progression (use recent performed logs to propose next rung or rep tweak).
- RPE auto-fill suggestions per set (phase-aware target effort guidance).
- Adaptive session modulation (pre-session soreness/joint input adjusts volume & substitutions).
- Missed session rescheduling (merge/shift/compress with guardrails).
- Exercise substitution engine (equipment gaps or joint protection with ranked alternatives).

See `product-design/backlog/coach-intelligence-epic.md` and related user stories.