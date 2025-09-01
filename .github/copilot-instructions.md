# AI Coding Agent Instructions for exercAIse

## Project Overview
- **exercAIse** is a markdown-based fitness and nutrition program generator, focused on structured, coach-style workout and meal plans for a 40-year-old male with recurring joint issues.
- The project is organized around two main AI personas:
  - **Kai** (Strength, Movement & Recovery Coach): workout generation, periodization, injury adaptation, and markdown formatting. See `.github/instructions/kai.instructions.md`.
  - **Mina** (Nutrition & Whole Foods Coach): meal/recipe suggestions, batch prep, and anti-inflammatory focus. See `.github/instructions/mina.instructions.md`.

## Directory & File Structure
- **workouts/**: All workout plans in markdown, named as `<blockNumber>-<weekNumber>_<Title>.md` (e.g., `1-3_Upper_Body_Strength.md`).
  - Each file contains a full session: warm-up, main sets, cues, cooldown, and (if relevant) date at the top.
  - Example: `1-2_Biceps_Triceps_Core_Workout.md` for accessory/arm/core day.
- **meals/**: (if present) Nutrition/meal plans, following Mina's conventions.
- **.github/instructions/**: Persona-specific rules for Kai and Mina. Always consult these before generating or editing workouts/meals.
- **README.md**: Lists all workouts in descending date order, with links and canonical names. Use as the source of truth for file naming and organization.

## Key Conventions & Patterns
- **Markdown-Only Content**: All workouts and meals are written in markdown for compatibility with older devices and easy logging.
- **Workout Structure**: Each workout includes:
  - Title, date (if applicable), and block/week context
  - Warm-up, main sets (with sets/reps/rest/weight/cues), accessory/core, cooldown
  - Bullet-point cues for every exercise
  - Adaptations for injuries or missed sessions (see Kai's rules)
- **Naming**: No dates in filenames; dates go in the document body if relevant.
- **Weekly Plan**: Follows a block periodization model (see Kai's instructions for details).
- **Recovery/Rest**: Yoga and mobility flows are included as markdown workouts, not separate.

## Developer Workflows
- **Adding a Workout**: Use the naming convention, update the README in descending date order, and follow Kai's output format.
- **Editing a Workout**: Always check `.github/instructions/kai.instructions.md` for up-to-date structure and adaptation rules.
- **Adding/Editing Meals**: Follow Mina's guidelines and file structure.
- **No Build/Test System**: This project is markdown-only; no build, test, or CI/CD steps are required.

## Integration & Extensibility
- **No external dependencies**: All content is markdown, no code or package dependencies.
- **AI Persona Guidance**: All AI agents must read and apply the relevant persona instructions before generating or editing content.
- **Chat Modes**: Use `.github/chatmodes/kai.chatmode.md` to run in Kai mode (workouts/recovery). Content generation and file integration follow:
  - Session: `.github/prompts/generate-workout-session.prompt.md`
  - Interface: `.github/prompts/generate-workout-interface.prompt.md`
- **Cross-File Consistency**: When renaming or reorganizing, update all references (especially in README.md).

## Examples
- See `workouts/1-3_Upper_Body_Strength.md` for a full strength session with cues, weights, and cooldown.
- See `workouts/1-3_recovery_Yin_Yoga_Rest_Day.md` for a recovery/yoga flow.
- See `.github/instructions/kai.instructions.md` and `.github/instructions/mina.instructions.md` for persona-specific rules.

---

## Required Workflow for Workouts and Exercises

### When creating or editing a workout:
- Exercise links in workout Markdown must point directly to the JSON exercise files: use `../../exercises/<slug>.json` when linking from docs inside `.github/`, and `../exercises/<slug>.json` inside `workouts/`. JSON is the source of truth and is rendered by `exercise.html`.
- If an exercise does not already exist in `exercises/`, create a new JSON file `exercises/<slug>.json` as the source of truth, following `schemas/exercise.schema.json` (v2 fields: setup, steps, cues, mistakes, scaling, prescriptionHints, joints, media). Optionally include a minimal `.md` for legacy viewers.
- Never leave an exercise unlinked or without a detail file.
- Update existing workouts if new exercises are introduced to maintain the linking convention.

### New Workout Prompt (for Kai):
Whenever a new workout is requested, always:
- Ask for injury/pain status before generating the workout.
- Confirm the workout progression state, which workout block/week it belongs to, and workout title.
- Generate the workout by following all Kai persona rules in `.github/instructions/kai.instructions.md`.
- For every exercise, ensure the name is a markdown link to its detail page under `exercises/` (e.g., in workouts: `[Goblet Squat](../exercises/goblet_squat.json)`).
- If a new exercise is introduced, create a new JSON detail file `exercises/goblet_squat.json` using the New Exercise JSON Prompt below.
- At the end, confirm that all exercises are linked and all new exercises have detail files.

### New Exercise JSON Prompt (for Kai):
When a new exercise is introduced (not found in `exercises/`):
- Create `exercises/<slug>.json` conforming to `schemas/exercise.schema.json` (v2) with fields:
  - `name` (required), `equipment` (string[]), `tags` (string[])
  - `setup` (string[]): how to position
  - `steps` (string[]): 3–7 ordered execution steps
  - `cues` (string[]): 3–5 short reminders (breath/alignment included)
  - `mistakes` (string[]): 2–4 common faults to avoid
  - `safety` (string): brief injury and pain-adaptation notes
  - `scaling` (regressions[], progressions[]): clear options for easier/harder
  - `variations` (string[]): lateral alternatives
  - `prescriptionHints` (load/reps/time/distance/rpe/notes)
  - `joints` (sensitiveJoints[], notes)
  - `media` (video, images[])
- Optionally add a minimal Markdown file `exercises/<slug>.md` with an H1 header for backwards compatibility; the site prefers JSON.
- Validate with `python3 scripts/validate_schemas.py`.
