# exercAIse

AI-generated personalized workout sessions with structured JSON logging and performance tracking.

## Browser Support
- **Modern browsers**: Chrome/Edge 90+, Firefox 88+, Safari 14+
- **Progressive Web App**: Install on mobile/desktop for offline access
- **TypeScript**: Full type safety with compiled ES2020 output
- **IndexedDB**: Performance logs stored in IndexedDB with localStorage fallback

## Documentation
- **[Architecture](ARCHITECTURE.md)**: System design, separation of concerns, and development guidelines
- **[User Stories](product-design/backlog/)**: Feature planning and requirements
- **[AI Instructions](.github/instructions/)**: Kai persona rules
- **[Contributing](.github/copilot-instructions.md)**: AI coding agent guidelines
- **[Modernization](MODERNIZATION.md)**: ES6+, TypeScript, testing, and IndexedDB migration roadmap

[Mock Session](workouts/mock_All_Types_Test.json)

## Instructions
- [Kai – Strength, Movement & Recovery Coach](.github/instructions/kai.instructions.md)

## Development Setup
- **Install git hooks**: Run `./scripts/install_hooks.sh` after cloning to auto-update the workout manifest on commits.
- **Workout manifest**: The `workouts/manifest.txt` file lists all workout sessions and is automatically updated:
  - **Locally**: Pre-commit hook updates it when you commit workout JSON files
  - **CI/CD**: GitHub Actions workflow updates it when workouts are pushed to the repo
  - **Manual**: Run `./scripts/update_workout_manifest.sh` if needed

## Validation
- Validate links: run the VS Code task “Validate Markdown Links” or `python3 scripts/validate_links.py`.
- Validate schemas: run the task “Validate Schemas” or `python3 scripts/validate_schemas.py`.
- CI: GitHub Actions runs both validators on pushes and PRs.

## Schemas
- `schemas/session.schema.json`: Canonical committed workout session files in `workouts/`.
- `schemas/exercise.schema.json`: Source of truth for exercise detail files in `exercises/`.
- `schemas/performance.schema.json`: Export format (`perf-1`) produced by the logger UI.
- `schemas/db.types.ts`: IndexedDB schema for performance logs, workout history, user settings, and exercise tracking.
- Legacy (historical only): `performed.schema.json` (older performed logs); no longer exported by the app.

Deprecated schemas removed: session_plan, session_v1, session_log (superseded by unified session + perf-1 export).

## Data Storage
- **IndexedDB (Primary)**: Performance logs, workout history, user settings stored in browser IndexedDB
  - 4 object stores: `performanceLogs`, `workoutHistory`, `userSettings`, `exerciseHistory`
  - Automatic migration from localStorage on first app load
  - Type-safe operations via `lib/storage.ts` adapter
- **localStorage (Fallback)**: Used when IndexedDB unavailable; dual-write ensures backwards compatibility
- **Export Format**: Performance logs exported as `perf-1` JSON (see `schemas/performance.schema.json`)

## Conventions
- Dumbbell weights: log as number or string. Examples: `25` (per hand implied), `"25 x2"` (explicit per hand), `"50 total"`.
- Movements without sets/weights: use time/hold/distance fields (e.g., `timeSeconds`, `holdSeconds`, `distanceMiles`; `distanceMeters` is supported for legacy files).
- Supersets vs circuits: both are supported; supersets typically pair 2 movements back-to-back, circuits are 3+ movements. In JSON (if used), `kind: "superset" | "circuit"` with `children` items.

### Dumbbell Ladder Personalization
- First encountered dumbbell load in a generated session establishes that session's ladder anchor (no snap on first load).
- Subsequent dumbbell loads are normalized upward to the nearest valid rung using 10 lb steps anchored to the first per-hand load:
	- If the first load ends in .5 (e.g., 7.5) → keep the .5 anchor: 7.5/17.5/27.5/...
	- If it ends in 5 → use 5/15/25/35/...
	- Otherwise round the first load up to the nearest 10 → 10/20/30/40/...
- If a prescribed load would jump multiple rungs, reps may be auto-reduced per Kai's ladder-induced adjustment rules.
- UI does not mutate loads post-generation; enforcement occurs in the generation backend for transparency.

### Offline (PWA) Minimal Support
- Basic app shell (index, assets, exercises, workouts JSON) cached by `sw.js` for offline viewing & logging continuity.
- Network-first strategy for generation API; falls back gracefully if offline (local deterministic generation still available).
- Icons currently placeholder (manifest `icons` array empty) — future enhancement before public release.

## Generate
- Form: open `index.html`, use the "Generate Session" form (goals, pain, equipment, optional instructions) or paste a `SessionPlan` JSON.
- API: client posts to `POST /api/kai/session-plan` (local server mock via `scripts/serve.py`).
- Validation: client validates schema. For pasted SessionPlans, exercises only become links when an explicit internal link is provided to `exercises/*.json` (or `.md`). Missing or invalid links are non-blocking: the exercise still renders as plain text with a warning.
- Fallback: if the API call fails, a local deterministic plan is generated and validated with the same guardrails.

Tip: Want to use your own LLM outside this app? See `product-design/prompts/sessionplan-external.prompt.md` for a copy-paste prompt and the minimal SessionPlan JSON shape the app accepts when you paste it.

### Provider (LLM) Generation (Optional)
To enable gpt-oss / vLLM local model generation instead of static fallback:
```bash
./scripts/start_vllm_kai.sh  # starts OpenAI-compatible server (default Llama 3 8B)
export KAI_USE_PROVIDER=1
export GPT_OSS_ENDPOINT=http://localhost:8000/v1/chat/completions
export GPT_OSS_MODEL=meta-llama/Meta-Llama-3-8B-Instruct
node scripts/test_session_plan.js --provider '{"goals":"upper strength","block":3,"week":2}'
```
If the provider fails or returns invalid JSON, the handler falls back to a static plan (see `serverless/api/kai/session-plan.js`).

#### Ollama (CPU Friendly Alternative)
```bash
brew install ollama
ollama pull llama3
export KAI_USE_PROVIDER=1
export KAI_PROVIDER=ollama
export OLLAMA_MODEL=llama3
node scripts/test_provider_health.js
node scripts/test_session_plan.js --provider '{"goals":"upper strength","block":3,"week":2}'
```
Set `OLLAMA_ENDPOINT` if not default. Falls back automatically on errors.