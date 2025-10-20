# exercAIse Architecture

## Overview
exercAIse is a JSON-first fitness program generator with a clear separation between AI-driven decision-making and client-side execution. The system is designed for personalized workout planning.

**Core Philosophy**: AI makes intelligent, context-aware decisions; the app faithfully executes and provides feedback.

## Table of Contents
- [System Architecture](#system-architecture)
- [Separation of Concerns](#separation-of-concerns)
- [AI Personas](#ai-personas)
- [Data Flow](#data-flow)
- [Technology Stack](#technology-stack)
- [Key Principles](#key-principles)
- [Directory Structure](#directory-structure)
- [Development Guidelines](#development-guidelines)

---

## System Architecture

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                            │
│                   (index.html, assets/app.js)                    │
│  - Display workouts & meals                                      │
│  - Collect performance data                                      │
│  - Export performance logs                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Load workouts/meals
                       │ Submit performance
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Static Content Layer                          │
│              (workouts/*.json, meals/*.md)                       │
│  - Pre-generated workout sessions                                │
│  - Meal plans and recipes                                        │
│  - Exercise definitions (exercises/*.json)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Generate new sessions
                       │ (optional, serverless)
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    AI Generation Layer                           │
│            (serverless/api/kai/session-plan.js)                  │
│  - LLM provider integration                                      │
│  - Prompt assembly (.github/prompts/)                            │
│  - NO workout logic (AI decides everything)                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Uses instructions & context
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                  AI Decision-Making Layer                        │
│      (.github/instructions/, .github/prompts/)                   │
│  - Kai: Workout generation, progression, injury adaptation       │
│  - Mina: Nutrition planning, meal prep, recipes                  │
│  - ALL workout logic lives here (ladder, progression, etc.)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Separation of Concerns

### ✅ AI Layer Responsibilities

**Location**: `.github/instructions/` and `.github/prompts/`

**What AI Decides**:
- Exercise selection based on training phase, fatigue, injuries
- Sets, reps, weight, RPE prescriptions
- Dumbbell ladder snapping (which rungs, when to snap, rep adjustments)
- Bench angle selection for incline/decline movements
- Rest periods between sets
- Progression logic (when to increase weight/reps)
- Workout structure (warm-up, main work, accessories, cooldown)
- Exercise substitutions for injuries or equipment limitations
- Deload timing and intensity

**What AI Never Does**:
- ❌ UI rendering or formatting
- ❌ Data storage or export format decisions
- ❌ Client-side calculations or transformations
- ❌ Form validation or input handling

### ✅ App Layer Responsibilities

**Location**: `assets/app.js`, `index.html`, schemas

**What App Does**:
- Display prescribed workouts (render JSON to UI)
- Collect user performance data (sets, reps, weight, RPE)
- Export performance logs (perf-1 format to `performed/`)
- Provide historical performance to AI for next prescription
- Validate data against schemas
- Handle backward compatibility (e.g., missing fields)
- Link validation and exercise stub generation

**What App Never Does**:
- ❌ Calculate workout progressions
- ❌ Decide exercise prescriptions
- ❌ Apply ladder snapping or rep adjustments
- ❌ Select exercises or weights
- ❌ Make training decisions

### 🚫 Anti-Pattern: Server-Side Workout Logic

**Removed in October 2025**: Previously, `serverless/api/kai/session-plan.js` contained ladder snapping logic that ran *after* AI generation. This created conflicting decision-making between AI and server.

**Correct Pattern**: AI generates complete prescriptions; server only handles HTTP and JSON formatting.

---

## AI Personas

### Kai – Strength, Movement & Recovery Coach
**Instructions**: `.github/instructions/kai.instructions.md`  
**Personal Context**: `.github/instructions/kai.personal.instructions.md`  
**Prompts**: `.github/prompts/generate-workout-session.prompt.md`

**Responsibilities**:
- Generate workout sessions (strength, conditioning, recovery)
- Apply block periodization (`.github/instructions/block-progression.instructions.md`)
- Adapt to injuries (wrist, ankle, neck issues)
- Implement dumbbell ladder preference (minimize plate changes)
- Prescribe RPE-based loading
- Structure warm-ups, main work, accessories, cooldowns

**Output Format**: JSON conforming to `schemas/session.schema.json`

### Mina – Nutrition & Whole Foods Coach
**Instructions**: `.github/instructions/mina.instructions.md`

**Responsibilities**:
- Meal plan generation
- Recipe suggestions
- Batch prep guidance
- Anti-inflammatory food focus

**Output Format**: Markdown in `meals/`

---

## Data Flow

### Workout Generation → Logging → History → Next Prescription

```
1. AI generates session with full prescription
   {
     "name": "Incline DB Press",
     "prescription": {
       "sets": 4,
       "reps": 8,
       "weight": "45 x2 lb",
       "rpe": 7.5,
       "angle": 30,  // AI selected this
       "restSeconds": 120
     }
   }
   ↓
2. App displays in UI
   "Incline DB Press (30°)"
   "4 × 8 @ 45 lb per hand, RPE 7.5, rest 120s"
   ↓
3. User logs actual performance
   Set 1: 45 lb × 2, 8 reps, RPE 7.5
   Set 2: 45 lb × 2, 8 reps, RPE 8
   ...
   ↓
4. App exports to performed/*.json
   {
     "version": "perf-1",
     "exercises": {
       "incline_dumbbell_bench_press": {
         "sets": [
           {"set": 1, "weight": 45, "multiplier": 2, 
            "reps": 8, "rpe": 7.5, "angle": 30}
         ]
       }
     }
   }
   ↓
5. App provides history to AI (next generation)
   "Recent incline_db_press_30: 4×8 @ 45×2, RPE 7.5-8"
   ↓
6. AI decides progression
   - Sees RPE 7.5-8 (moderate)
   - Applies ladder: 45 → next rung is 50
   - Reduces reps: 4×8 → 4×6 to maintain RPE ≤8
   - Prescribes: 4×6 @ 50×2, RPE 7-8, angle 30
```

---

## Technology Stack

### Client-Side
- **Pure JavaScript (ES5)**: Legacy iPad Safari compatibility
- **No framework**: Vanilla JS for maximum compatibility
- **XHR instead of fetch**: Broader browser support
- **Markdown rendering**: Minimal, custom implementation

### Serverless Functions (Optional)
- **Node.js**: `serverless/api/kai/session-plan.js`
- **LLM Integration**: OpenAI, Claude, or local Ollama
- **Prompt Assembly**: Combines instructions + context

### Data Storage
- **Static Files**: Markdown and JSON in Git
- **Local Storage**: Browser localStorage for performance logs
- **GitHub**: Version control and deployment

### Validation & Testing
- **JSON Schema**: Validate workouts, exercises, performance
- **Python Scripts**: Link validation, schema validation, linting
- **Playwright**: UI/integration tests
- **Node.js Tests**: Rep range normalization, utilities

---

## Key Principles

### 1. AI Decides, App Executes
The most important architectural principle. All training logic lives in AI instructions/prompts, never in app code.

**Example: Dumbbell Ladder**
- ❌ **Wrong**: Server-side `applyDumbbellLadder()` function
- ✅ **Right**: AI receives ladder rules in prompt, decides all snapping

### 2. Data is the API
Workouts are JSON files following schemas. The app reads and writes JSON; it doesn't interpret training logic.

### 3. Backward Compatibility
- Schemas use optional fields for new features
- Missing fields get sensible defaults (e.g., `angle: 0` for flat bench)
- Old performance logs remain valid

### 4. Markdown for Humans, JSON for Machines
- Markdown workouts for legacy viewing and git diffs
- JSON workouts as source of truth for app
- Both formats supported

### 5. Progressive Enhancement
- Core functionality works offline (static files)
- AI generation is optional enhancement
- Graceful degradation (fallback templates)

### 6. Exercise Definitions as Source of Truth
- `exercises/*.json` define exercise details (v2 schema)
- Include setup, steps, cues, safety, scaling, joints
- Linked from workouts for full context

---

## Directory Structure

```
exercAIse/
├── .github/
│   ├── instructions/           # AI decision-making rules
│   │   ├── kai.instructions.md           # Kai persona & output format
│   │   ├── kai.personal.instructions.md  # User-specific context
│   │   ├── block-progression.instructions.md  # Periodization model
│   ├── prompts/                # AI generation prompts
│   │   ├── generate-workout-session.prompt.md  # Complete workout generation
│   ├── chatmodes/              # AI chat configurations
│   └── workflows/              # GitHub Actions CI/CD
│
├── workouts/                   # Generated workout sessions
│   ├── *.json                  # Session files (source of truth)
│   └── *.md                    # Legacy markdown (deprecated)
│
├── exercises/                  # Exercise definitions
│   └── *.json                  # Exercise details (v2 schema)
│
├── performed/                  # Performance logs (perf-1)
│   └── *.json                  # Exported from app after workouts
│
├── meals/                      # Nutrition content
│   └── *.md                    # Meal plans and recipes
│
├── schemas/                    # JSON Schema definitions
│   ├── session.schema.json     # Workout session structure
│   ├── exercise.schema.json    # Exercise definition (v2)
│   ├── performance.schema.json # Performance export (perf-1)
│   └── ...
│
├── assets/                     # Client-side app
│   ├── app.js                  # Main app logic (display, logging, export)
│   ├── exercise.js             # Exercise detail page logic
│   └── styles.css
│
├── serverless/                 # Optional AI generation
│   ├── api/kai/session-plan.js # Generation endpoint (NO workout logic)
│   └── lib/                    # Provider integrations, prompt assembly
│
├── scripts/                    # Validation and utilities
│   ├── validate_links.py
│   ├── validate_schemas.py
│   ├── lint_sessions.py
│   └── prescribe_loads.py      # History analysis for AI context
│
├── tests/                      # Testing
│   └── *.test.js
│
├── product-design/             # Design docs and planning
│   ├── backlog/
│   ├── notes/
│   └── architecture.md         # (this document)
│
├── index.html                  # Main app entry point
├── exercise.html               # Exercise detail viewer
├── README.md                   # User-facing documentation
└── ARCHITECTURE.md             # This document
```

---

## Development Guidelines

### Adding a New Feature

#### 1. Determine Layer Ownership
**Question**: Does this feature involve training decisions or logic?

**If YES** → AI Layer Feature
- Add to `.github/instructions/kai.personal.instructions.md` or prompts
- Update AI context/prompts
- Extend schemas if needed for new data fields
- Update app to display/log new fields (read-only)

**If NO** → App Layer Feature
- Implement in `assets/app.js`
- Add schema validation
- Write tests

#### 2. Follow the Pattern
Look at existing features:
- **Dumbbell Ladder**: All logic in AI prompts, app just displays/logs
- **Bench Angles** (planned): AI selects angle, app displays/logs/tracks
- **RPE Tracking**: AI prescribes target, app collects actual

#### 3. Update Documentation
- Add to `ARCHITECTURE.md` if it changes patterns
- Update relevant instructions/prompts
- Add to README if user-facing
- Write user story in `product-design/backlog/`

### Code Review Checklist
- [ ] Does the feature respect AI-decides/app-executes boundary?
- [ ] Are new fields optional in schemas (backward compatibility)?
- [ ] Is the AI given sufficient context to make decisions?
- [ ] Does the app provide clear feedback to the AI (via history)?
- [ ] Are there tests for the new functionality?
- [ ] Is documentation updated?

### Testing Strategy
1. **Schema Validation**: All JSON must validate against schemas
2. **Link Validation**: All exercise links must resolve
3. **Lint**: Session structure must follow conventions
4. **Unit Tests**: Core logic (rep range normalization, etc.)
5. **Integration Tests**: Playwright for full user flows
6. **Manual Testing**: Test with actual workouts/logging

### Common Pitfalls to Avoid

❌ **DON'T**: Add workout logic to `serverless/api/kai/session-plan.js`
```javascript
// WRONG - Server should not make training decisions
function adjustRepsForWeight(weight, reps) {
  if (weight > 50) return reps - 2;
  return reps;
}
```

✅ **DO**: Add workout logic to AI prompts
```markdown
# In .github/prompts/generate-workout-session.prompt.md
When prescribing dumbbell exercises:
- If weight > 50 lb per hand, reduce reps by 2 from base prescription
- Maintain target RPE by balancing load and volume
```

❌ **DON'T**: Calculate progressions in app
```javascript
// WRONG - App should not decide next workout
function getNextWeight(lastWeight, lastRPE) {
  if (lastRPE < 7) return lastWeight + 5;
  return lastWeight;
}
```

✅ **DO**: Provide history; let AI decide
```javascript
// RIGHT - App provides data, AI makes decision
function formatHistoryForAI(performedLogs) {
  return performedLogs.map(log => ({
    exercise: log.exercise,
    weight: log.weight,
    reps: log.reps,
    rpe: log.rpe,
    date: log.date
  }));
}
```

---

## Future Enhancements

### Planned Features (Post-MVP)
1. **Bench Angles**: AI-selected angles with angle-specific history tracking
2. **Exercise Swaps**: AI-driven substitutions based on equipment/injury
3. **Block Auto-Advancement**: AI detects when to move to next block
4. **Nutrition Integration**: Coordinated workout + meal planning
5. **Progressive Insights**: AI summarizes trends and recommends focus areas

### Architectural Improvements
1. **Type Safety**: Consider TypeScript for app layer (maintain ES5 output)
2. **Offline-First**: Enhanced PWA capabilities
3. **Performance Metrics**: Analytics dashboard (AI-interpreted)
4. **Multi-User**: Support for different user profiles (each with own instructions)

---

## Related Documents
- **User Documentation**: `README.md`
- **AI Instructions**: `.github/instructions/`
- **AI Prompts**: `.github/prompts/`
- **Schemas**: `schemas/`
- **User Stories**: `product-design/backlog/`
- **Design Notes**: `product-design/notes/`

---

## Version History
- **October 2025**: Initial architecture document created
- **October 2025**: Server-side ladder logic removed (moved to AI layer)
- **October 2025**: Bench angles feature designed with proper separation

---

## Questions?
For architecture questions or clarification, refer to:
1. This document for high-level patterns
2. `.github/copilot-instructions.md` for AI coding agent guidance
3. Specific instruction files in `.github/instructions/` for persona rules
4. Code comments in `assets/app.js` for implementation details
