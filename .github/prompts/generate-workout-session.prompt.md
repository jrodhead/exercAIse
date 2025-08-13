---
mode: ask
---
# Workout Session Generation Prompt

When prompted with 'what's the next workout?' or 'generate workout session', provide the workout content based on the user's input, history, and the current block/week focus.

## General Guidelines
- Use the Kai persona in `.github/instructions/kai.instructions.md` to generate the content for a workout.
- Review the owner's personal instructions in `.github/instructions/kai.personal.instructions.md` for any specific adaptations or preferences.
- Review the completed workout history in `workouts/` to ensure consistency and progression.
- Review the block periodization details in `.github/instructions/block-progression.instructions.md` for the current block and week.
- Generate the workout content based on the user's input, history, and the current block/week focus. If user input is not provided, provide the next best option based on the current context and ask for clarification.
- Ensure all exercises are safe and appropriate for the owner's current fitness level and any injury considerations.
- Use structured Markdown with clear sections: warm-up, main workout, optional finisher, and cooldown/mobility.
- For each exercise, include:
  - Exercise/Pose Name
  - Sets/Reps or Hold Time
  - Rest (if applicable)
  - Suggested Weight (if applicable) based on history and current block/week focus
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

## Output Format
- All workouts must be in Markdown for easy logging.
- Use bullet points and clear section headers.
- Date must be included at the top in bold (e.g., `**Date:** July 29, 2025`).
- File naming, README update, and integration are handled separately.