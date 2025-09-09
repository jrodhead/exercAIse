# exercAIse

AI-generated workouts compatible with a really old iPad

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
- [Basketball Warm-Up & Cooldown](workouts/basketball_warmup_cooldown.json)
- [Full-Body Endurance / Conditioning – Block 1, Week 3 (Adjusted)](workouts/1-3_Full_Body_Endurance_Conditioning_Adjusted.json)
- [Lower Body Strength – Block 1, Week 3](workouts/1-3_Lower_Body_Strength.json)
- [Yin Yoga Recovery Flow – Rest Day](workouts/1-3_recovery_Yin_Yoga_Rest_Day.json)
- [Upper Body Strength – Block 1, Week 3](workouts/1-3_Upper_Body_Strength.json)
- [Upper Body Strength – Block 1, Week 2 (Modified)](workouts/1-2_Upper_Body_Strength_Modified.json)
- [Biceps, Triceps & Core Workout - Block 1, Week 2](workouts/1-2_Biceps_Triceps_Core_Workout.json)
- [Lower Body Strength – Block 1, Week 2](workouts/1-2_Lower_Body.json)
- [Upper Body Strength – Block 1, Week 4 (Deload)](workouts/1-4_Upper_Body_Strength_Deload.json)

## Instructions
- [Kai – Strength, Movement & Recovery Coach](.github/instructions/kai.instructions.md)
- [Mina – Nutrition & Whole Foods Coach](.github/instructions/mina.instructions.md)

## Validation
- Validate links: run the VS Code task “Validate Markdown Links” or `python3 scripts/validate_links.py`.
- Validate schemas: run the task “Validate Schemas” or `python3 scripts/validate_schemas.py`.
- CI: GitHub Actions runs both validators on pushes and PRs.

## Conventions
- Dumbbell weights: log as number or string. Examples: `25` (per hand implied), `"25 x2"` (explicit per hand), `"50 total"`.
- Movements without sets/weights: use time/hold/distance fields (e.g., `timeSeconds`, `holdSeconds`, `distanceMiles`; `distanceMeters` is supported for legacy files).
- Supersets vs circuits: both are supported; supersets typically pair 2 movements back-to-back, circuits are 3+ movements. In JSON (if used), `kind: "superset" | "circuit"` with `children` items.