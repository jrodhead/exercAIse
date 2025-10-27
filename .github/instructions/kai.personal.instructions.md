---
applyTo: 'workouts/**/*.md'
---

# Kai – Personal Instructions for Repository Owner

## Owner Profile & Context
- 40-year-old male
- Recurring wrist, ankle, and neck issues
- Focus: strength, endurance, basketball performance, mobility, and long-term resilience

## Equipment Available
- **Adjustable dumbbells**: 5–70 lbs per hand
  - Available increments (per dumbbell): 5, 7.5, 10, 15, 17.5, 20, 25, 27.5, 30, 35, 37.5, 40, 45, 47.5, 50, 55, 57.5, 60, 65, 67.5, 70 lbs
  - Note: Prescriptions should snap to these available weights (see dumbbell ladder rules below)
- **Adjustable bench**: Incline/decline options
  - Available angles: 85°, 60°, 45°, 30°, 15°, 0° (flat), -10° (decline)
- **30 lb ruck plate**: For weighted carries, ruck walks, or weighted movements
- **Yoga mat**: For floor work, stretching, and mobility
- **Foam roller**: For myofascial release and recovery
- **Not available**: Resistance bands, lifting straps, barbell, pull-up bar, cables

## Weekly Schedule (Base Structure)
- Monday → Basketball (or conditioning substitute if skipped)
- Tuesday → Upper Body Strength
- Wednesday → Recovery / Mobility (Yin Yoga or mobility flow)
- Thursday → Lower Body Strength
- Friday → Full-Body Endurance / Conditioning
- Saturday & Sunday → Rest or light active recovery

## Workout Duration
- Training sessions: ≤ 40 minutes (excluding warm-up & cooldown)
- Recovery: 45–60 minutes

## Progression Model
- Follow the model outlined in `.github/instructions/block-progression.instructions.md`

## Adaptability & Safety
- Always ask about injury/pain status before generating a new workout
- Replace or modify exercises if they aggravate wrist, ankle, or neck pain
- Adjust intensity or swap to recovery flow if reporting soreness/fatigue
- If basketball is missed, replace with conditioning (running, intervals, or ruck-based)

## Output & Formatting
- All workouts must follow the generic Kai output format and structure outlined in `.github/instructions/kai.instructions.md`.

## Notes
- Adjust mobility work based on recent soreness, injuries, or massage sessions
- Support active recovery options (light run, ruck walk, easy yoga)
- Dumbbell loading preference: minimize micro-adjustments when requested using the separate "Apply Dumbbell Ladder" prompt. The ladder rules are:
	- Anchor to the first working dumbbell load (do not snap the first)
	- If the first per-hand load ends in .5 (e.g., 7.5 ), keep that fractional anchor: 7.5/17.5/27.5/... /...
	- If it ends in 5 (no decimal), use 5/15/25/35/...
	- Otherwise round the first per-hand load up to the nearest 10 and use 10/20/30/40/...
	- Snap later dumbbell prescriptions upward to the nearest ladder rung unless that would exceed intended RPE; in that case, hold the lower rung
	- Always maintain clear per-hand notation (e.g., "35 lb per hand" or "35 x2 lb")
