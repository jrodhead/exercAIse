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
│         (index.html, week.html, progress-report.html)            │
│  - Display workouts & meals                                      │
│  - Collect performance data                                      │
│  - Export performance logs                                       │
│  - Display AI-generated progress reports (JSON-based)            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ Load workouts/meals/reports
                       │ Submit performance
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Static Content Layer                          │
│      (workouts/*.json, meals/*.md, reports/*.json)               │
│  - Pre-generated workout sessions                                │
│  - Meal plans and recipes                                        │
│  - Exercise definitions (exercises/*.json)                       │
│  - Progress reports (structured JSON, AI-generated)              │
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
- Display AI-generated progress reports (render JSON, don't analyze)
- Render progress reports from structured JSON using design system
- Validate data against schemas
- Handle backward compatibility (e.g., missing fields)
- Link validation and exercise stub generation

**What App Never Does**:
- ❌ Calculate workout progressions
- ❌ Decide exercise prescriptions
- ❌ Apply ladder snapping or rep adjustments
- ❌ Select exercises or weights
- ❌ Make training decisions
- ❌ Analyze performance data or identify trends (AI does this)

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
     "metadata": { "title": "Chest & Triceps", "block": 5, "week": 1 },
     "sections": [
       {
         "type": "Strength",
         "title": "Main Work",
         "items": [
           {
             "kind": "superset",
             "name": "Superset A",
             "children": [
               {
                 "name": "Flat DB Bench Press",
                 "prescription": { 
                   "sets": 3, "reps": 8, "weight": "45 x2 lb", 
                   "rpe": 7.5, "restSeconds": 90
                 }
               },
               {
                 "name": "Close-Grip DB Press",
                 "prescription": {
                   "sets": 3, "reps": 10, "weight": "30 x2 lb",
                   "rpe": 7.5
                 }
               }
             ]
           }
         ]
       }
     ]
   }
   ↓
2. App displays in UI with superset structure
   "Superset A (3 rounds, 90s rest)"
   • Flat DB Bench: 3×8 @ 45×2, RPE 7.5
   • Close-Grip DB Press: 3×10 @ 30×2, RPE 7.5
   ↓
3. User logs actual performance
   Round 1: Bench 45×2 × 8 @ RPE 7.5, Close-Grip 30×2 × 10 @ RPE 7
   Round 2: Bench 45×2 × 8 @ RPE 8,   Close-Grip 30×2 × 10 @ RPE 8
   Round 3: Bench 45×2 × 6 @ RPE 9,   Close-Grip 30×2 × 8 @ RPE 9
   ↓
4. App exports to performed/*.json (perf-2 format)
   {
     "version": "perf-2",
     "workoutFile": "workouts/5-1_Chest_Triceps.json",
     "sections": [
       {
         "type": "Strength",
         "title": "Main Work",
         "items": [
           {
             "kind": "superset",
             "name": "Superset A",
             "rounds": [
               {
                 "round": 1,
                 "prescribedRestSeconds": 90,
                 "exercises": [
                   {"key": "flat-dumbbell-bench-press", "weight": 45, 
                    "multiplier": 2, "reps": 8, "rpe": 7.5},
                   {"key": "close-grip-dumbbell-press", "weight": 30,
                    "multiplier": 2, "reps": 10, "rpe": 7}
                 ]
               },
               {
                 "round": 2,
                 "exercises": [
                   {"key": "flat-dumbbell-bench-press", "weight": 45,
                    "multiplier": 2, "reps": 8, "rpe": 8},
                   {"key": "close-grip-dumbbell-press", "weight": 30,
                    "multiplier": 2, "reps": 10, "rpe": 8}
                 ]
               },
               {
                 "round": 3,
                 "exercises": [
                   {"key": "flat-dumbbell-bench-press", "weight": 45,
                    "multiplier": 2, "reps": 6, "rpe": 9},
                   {"key": "close-grip-dumbbell-press", "weight": 30,
                    "multiplier": 2, "reps": 8, "rpe": 9}
                 ]
               }
             ]
           }
         ]
       }
     ],
     "exerciseIndex": {
       "flat-dumbbell-bench-press": {
         "sectionPath": "sections[0].items[0].rounds[*].exercises[0]",
         "totalRounds": 3,
         "avgRPE": 8.17,
         "totalVolume": 1980
       }
     }
   }
   ↓
5. AI reviews nested performance data
   Observes:
   - Bench press: Round 1-2 @ RPE 7.5-8 (good)
   - Bench press: Round 3 @ RPE 9, reps dropped to 6 (fatigue)
   - Close-grip: RPE 7→8→9 across rounds (compounding triceps fatigue)
   
   Analysis:
   - NOT "exercise too heavy" (round 1 was RPE 7.5)
   - YES "fatigue cascade from pairing" (triceps pre-fatigued by bench)
   ↓
6. AI decides progression
   Option A (increase load):
   - Bench: 45×2 → 50×2 (ladder snap), reduce to 3×6 @ RPE 7-8
   - Close-grip: maintain 30×2 but 3×8 instead of 3×10
   
   Option B (manage fatigue):
   - Separate exercises (bench → straight sets)
   - Or increase rest: 90s → 120s between rounds
   - Or antagonist pairing (bench + rows instead of bench + triceps)
```

### Performance Log Formats

**perf-2 (Current)**: Nested structure preserving workout organization
- Used for all JSON workouts
- Captures sections, supersets/circuits with rounds
- Round-by-round performance tracking
- Exercise index for fast queries
- Enables fatigue analysis and intelligent progression

**perf-1 (Legacy)**: Flat exercise map
- Used only for markdown workouts
- Simple map: `{ "exercise_name": { "sets": [...] } }`
- No structure preservation
- Limited context for AI analysis

---

## Technology Stack

### Client-Side
- **TypeScript (ES2020)**: Full type safety, compiled to modern JavaScript
- **No framework**: Vanilla JS for maximum compatibility
- **Modular Architecture**: Session parser, form builder, Kai integration, storage adapter
- **IndexedDB**: Primary data storage with localStorage fallback

### Data Storage
- **IndexedDB (Primary)**: Browser native structured database
  - `performanceLogs`: User workout performance data
  - `workoutHistory`: Session completion tracking
  - `userSettings`: User preferences and configuration
  - `exerciseHistory`: Exercise-specific tracking and PRs
  - Automatic migration from localStorage on first app load
  - Type-safe operations via `lib/storage.ts` adapter
- **localStorage (Fallback)**: Used when IndexedDB unavailable
- **Dual-Write Strategy**: Backwards compatible, writes to both stores
- **Static Files**: Workouts (JSON), meals (Markdown), exercises (JSON) in Git
- **GitHub**: Version control and deployment

### Serverless Functions (Optional)
- **Node.js**: `serverless/api/kai/session-plan.js`
- **LLM Integration**: OpenAI, Claude, or local Ollama
- **Prompt Assembly**: Combines instructions + context

### Validation & Testing
- **JSON Schema**: Validate workouts, exercises, performance (perf-2 and perf-1)
- **TypeScript**: Compile-time type checking
- **Vitest**: 78 unit tests (session parser, Kai integration, IndexedDB)
- **Playwright**: 140 E2E tests (UI, workflows, error handling, perf-2 structure, progress reports)
  - 11 perf-2-specific tests (structure validation, data quality, round tracking)
  - 23 progress-report tests (JSON rendering, metadata, integration)
  - 106 general UI tests (navigation, history, forms, etc.)
- **Python Scripts**: Link validation, schema validation, session linting
- **CI/CD**: GitHub Actions runs all tests on push/PR

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

### 7. Type Safety and Modern Architecture
- TypeScript provides compile-time guarantees
- Modular architecture with clear separation (parser, forms, storage, AI integration)
- IndexedDB for scalable client-side data storage
- Comprehensive testing (78 unit tests + 26 E2E tests)

### 8. Progress Analysis vs. Training Decisions
- **Progress Reports**: AI analyzes historical data and generates comprehensive structured analysis (JSON)
- **Report Rendering**: App renders JSON reports using design system (BEM classes, CSS variables, dark mode)
- **AI Prescriptions**: AI makes training decisions based on analysis (what should happen next)
- Progress reports are AI-generated data structures, not client-side calculations
- App displays AI-generated reports, doesn't compute statistics or draw conclusions
- AI reviews progress context when generating next workouts
- Reports follow same pattern as workouts: JSON schema → TypeScript types → Renderer

**Example: Progress Report Architecture**
- ❌ **Wrong**: Client-side JavaScript calculates load progressions, identifies plateaus, suggests interventions
- ✅ **Right**: AI reads `performed/*.json`, generates `reports/*.json` with structured data (KPIs, tables, analysis), app renders using `progress-report-renderer.ts`

**Example: Workout Prescription**
- ❌ **Wrong**: App decides "user's squat RPE was 9, reduce weight by 10%"
- ✅ **Right**: AI sees history, decides "maintain 185 lb but reduce to 3×5 from 4×6"

---

## Progress Reports Architecture

### Overview
Progress reports follow the same "AI decides, App executes" pattern as workouts:
- **AI** analyzes performance logs and generates structured JSON reports
- **App** renders JSON using design system (no inline styles, no HTML generation)

### Architecture Pattern

```
Performance Logs (performed/*.json)
    ↓
User selects time range
    ↓
Kai (AI) analyzes data
    ↓
Generates report.json (structured data)
    ↓
Saved to reports/YYYY-MM-DD_blocks-X-Y.json
    ↓
App loads JSON
    ↓
progress-report-renderer.ts renders UI
    ↓
User sees styled report using styles.css
```

### Report Structure
Reports are JSON files following `schemas/progress-report.schema.json`:

**Top-level structure**:
- `version`: Schema version (e.g., "1.0")
- `metadata`: Report identification (reportId, generatedDate, period)
- `summary`: Overview KPIs displayed as cards
- `sections[]`: Array of typed sections (strength-analysis, table, text, highlight-box, kpi-grid)

**Section Types**:
1. **strength-analysis**: Movement pattern analysis with subsections (table + observation)
2. **table**: Exercise tables or generic data tables (headers + rows)
3. **text**: Prose content with paragraphs and lists
4. **highlight-box**: Callout boxes with sentiment (success, warning, info, neutral)
5. **kpi-grid**: Grid of key performance indicators with sentiment styling

### Rendering Pipeline

**Component**: `assets/progress-report-renderer.ts`

**Responsibilities**:
- ✅ Validate report JSON structure
- ✅ Render sections to DOM using BEM classes
- ✅ Apply sentiment styling (success/warning/info/neutral)
- ✅ Handle missing or malformed data gracefully
- ❌ Never calculate statistics or analyze data
- ❌ Never inject inline styles

**BEM Naming Convention**:
```css
.report-container              /* Root container */
.report-header                 /* Report metadata */
.report-summary                /* KPI cards section */
.report-section                /* Section wrapper */
.report-section--text          /* Text section variant */
.report-section--table         /* Table section variant */
.report-section__content       /* Section content area */
.report-table                  /* Table component */
.report-table__header          /* Table header row */
.report-table__row             /* Table body row */
.report-table__cell            /* Table cell */
.report-highlight-box          /* Callout box */
.report-highlight-box--success /* Success variant */
```

**Dark Mode**:
- All colors use CSS variables: `var(--color-primary)`, `var(--color-bg-dark)`, etc.
- Automatic adaptation via `@media (prefers-color-scheme: dark)`
- No hardcoded colors or inline styles

### Type Safety

**Types**: `types/progress-report.types.ts`

**Key Interfaces**:
- `ProgressReport`: Top-level report structure
- `Metadata`, `Summary`, `Period`: Metadata types
- `Section`: Discriminated union of all section types
- `StrengthAnalysisSection`, `TableSection`, `TextSection`, etc.

**Type Guards**:
```typescript
isStrengthAnalysisSection(section: Section): section is StrengthAnalysisSection
isTableSection(section: Section): section is TableSection
// ... etc.
```

**Validation**:
```typescript
validateProgressReport(report: any): ValidationResult
```

### AI Generation

**Prompt**: `.github/prompts/generate-training-progress-report.prompt.md`

**AI Responsibilities**:
- ✅ Read performance logs from `performed/`
- ✅ Analyze strength progression, volume trends, RPE patterns
- ✅ Identify achievements, concerns, and recommendations
- ✅ Generate structured JSON matching schema
- ✅ Save report to `reports/` with proper filename
- ✅ Update `reports/index.json` manifest
- ❌ Never generate HTML or inline styles

**Example AI Workflow**:
1. User selects "Last 4 Weeks" in progress-report.html
2. User copies prompt from UI
3. Kai reads all `performed/*.json` in date range
4. Kai analyzes data (progression, trends, concerns)
5. Kai generates JSON report with sections
6. Kai validates JSON against schema
7. Kai saves to `reports/2025-11-07_blocks-4-4.json`
8. User refreshes page to see rendered report

### File Organization

```
reports/
├── index.json                      # Manifest (v2.0)
├── 2025-11-03_blocks-2-4.json     # 10.5-week report
├── 2025-11-03_blocks-4-4.json     # Block 4 report
├── archive/                        # Legacy HTML reports
│   ├── 2025-11-03_blocks-2-4.html
│   └── 2025-11-03_blocks-4-4.html
└── README.md                       # Generation instructions
```

**Manifest Format** (`reports/index.json`):
```json
{
  "version": "2.0",
  "reports": [
    {
      "filename": "2025-11-03_blocks-4-4.json",
      "title": "Block 4 Progress Report",
      "date": "2025-11-03",
      "blocks": [4],
      "format": "json"
    }
  ]
}
```

### Testing

**Unit Tests**: `tests/unit/progress-report-renderer.test.ts`
- 60 Vitest tests for validation, rendering, error handling
- Mock DOM limitations: 19/60 passing (renderer works in browser)

**UI Tests**: `tests/ui/progress-reports.spec.ts`
- 33 Playwright E2E tests ✅ **100% passing**
- Tests: loading, rendering all section types, dark mode, responsive design, accessibility

**Validation**: `python3 scripts/validate_schemas.py`
- All report JSON files validate against schema

### Design System Integration

Reports use the same design tokens as the rest of the app:

**Colors**: `--color-primary`, `--color-success`, `--color-warning`, `--color-error`
**Spacing**: `--space-2`, `--space-4`, `--space-6`, `--space-8`
**Typography**: `--font-size-base`, `--font-size-lg`, `--line-height-body`
**Borders**: `--border-width`, `--radius-sm`, `--radius-md`

**Responsive Breakpoints**:
- Mobile: `max-width: 768px`
- Tablet: `768px - 1024px`
- Desktop: `min-width: 1024px`

### Backward Compatibility

**Migration from HTML**:
- All HTML reports moved to `reports/archive/`
- Manifest updated to v2.0 (JSON format)
- No HTML rendering code in app (JSON-only)
- Legacy support removed (clean architecture)

**Schema Evolution**:
- Optional fields for new section types
- Version field allows future schema changes
- Type guards handle unknown section types gracefully

### Future Enhancements

**Planned**:
- [ ] Export report as PDF
- [ ] Compare multiple reports side-by-side
- [ ] Report templates for different training phases
- [ ] Chart/graph components (beyond tables)
- [ ] Serverless function for automatic generation

**Architectural Notes**:
- All future features must respect "AI decides, App executes"
- New section types must have schema definitions
- All styling must use design system tokens
- No inline styles or hardcoded colors

---

## Data Storage Architecture

### Storage Strategy
exercAIse uses a dual-storage approach for performance data:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Storage Adapter                              │
│                   (lib/storage.ts)                               │
│  - Unified interface for data operations                         │
│  - Automatic backend selection                                   │
│  - Migration management                                          │
└───────────────┬─────────────────────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
        ↓                ↓
┌──────────────┐  ┌──────────────┐
│  IndexedDB   │  │ localStorage │
│  (Primary)   │  │  (Fallback)  │
└──────────────┘  └──────────────┘
```

### IndexedDB Schema
**Database**: `exercAIse-db`
**Version**: 1

**Object Stores**:
1. **performanceLogs** - User workout performance data
   - Primary key: `id` (auto-increment)
   - Indexes: `file`, `date`, `[block+week]` (compound)
   
2. **workoutHistory** - Session completion tracking
   - Primary key: `id` (auto-increment)
   - Indexes: `file`, `completedAt`, `block`, `week`
   
3. **userSettings** - User preferences and configuration
   - Primary key: `key`
   - Values: Any JSON-serializable data
   
4. **exerciseHistory** - Exercise-specific tracking and PRs
   - Primary key: `id` (auto-increment)
   - Indexes: `exerciseSlug`, `date`

### Migration Strategy
- **Automatic**: On first app load, localStorage data auto-migrates to IndexedDB
- **Status Tracking**: `localStorage.getItem('exercAIse-migration-status')` stores completion state
- **Rollback**: `rollbackMigration()` available if needed (reverts to localStorage)
- **Backward Compatible**: Old localStorage keys remain readable for emergency fallback

### Storage Operations
All storage operations go through the `StorageAdapter` singleton:

```typescript
// Initialize (auto-migrates if needed)
await storage.init();

// Save performance log (dual-write)
await storage.savePerformanceLog(performanceData);

// Query performance logs
const logs = await storage.getPerformanceLogs('4-2_Lower_Body.json');
const recent = await storage.getRecentPerformanceLogs(10);

// Settings
await storage.setSetting('dark_mode', true);
const darkMode = await storage.getSetting('dark_mode');

// Export all data
const allData = await storage.exportAll();
```

### App Integration
- **Primary Path**: App writes to both IndexedDB and localStorage (backwards compatible)
- **Read Path**: Prefers localStorage for immediate reads (synchronous)
- **Background Sync**: IndexedDB writes happen asynchronously
- **No Breaking Changes**: Existing functionality preserved during migration

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
│   │   └── apply-dumbbell-ladder.prompt.md    # Dumbbell load optimization
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
├── reports/                    # AI-generated progress reports
│   ├── index.json              # Report manifest (v2.0 - JSON format)
│   ├── *.json                  # Progress reports (structured data)
│   ├── archive/                # Legacy HTML reports (deprecated)
│   └── README.md               # Report generation instructions
│
├── meals/                      # Nutrition content
│   └── *.md                    # Meal plans and recipes
│
├── schemas/                    # JSON Schema definitions
│   ├── session.schema.json     # Workout session structure
│   ├── exercise.schema.json    # Exercise definition (v2)
│   ├── performance.schema.json # Performance export (perf-1)
│   ├── progress-report.schema.json  # Progress report structure
│   └── ...
│
├── types/                      # TypeScript type definitions
│   ├── db.types.ts             # IndexedDB schema and types
│   ├── performance.types.ts    # Performance log types
│   ├── progress-report.types.ts # Progress report types
│   ├── global.types.ts         # Window API extensions
│   └── index.ts                # Type exports
│
├── lib/                        # Core libraries
│   ├── db.ts                   # IndexedDB wrapper
│   ├── migration.ts            # localStorage → IndexedDB migration
│   └── storage.ts              # Unified storage adapter
│
├── assets/                     # Client-side app (TypeScript)
│   ├── app.ts                  # Main app logic (display, logging, export)
│   ├── exercise.ts             # Exercise detail page logic
│   ├── form-builder.ts         # Dynamic form generation
│   ├── session-parser.ts       # JSON/Markdown parsing
│   ├── kai-integration.ts      # AI validation and integration
│   ├── storage-adapter.ts      # Storage module wrapper
│   ├── progress-report-renderer.ts  # Progress report rendering
│   └── styles.css
│
├── dist/                       # Compiled JavaScript (generated)
│   └── assets/*.js             # TypeScript compilation output
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
│   ├── unit/                   # Vitest unit tests
│   │   ├── db.test.ts          # IndexedDB tests (18 tests)
│   │   ├── migration.test.ts   # Migration tests (8 tests)
│   │   ├── storage.test.ts     # Storage adapter tests (13 tests)
│   │   ├── session-parser.test.ts # Parser tests (36 tests)
│   │   ├── kai-integration.test.ts # Integration tests (27 tests)
│   │   └── progress-report-renderer.test.ts # Renderer tests (60 tests)
│   ├── integration/            # Integration tests
│   │   └── workout-parsing.test.ts # Workflow tests (15 tests)
│   └── ui/                     # Playwright E2E tests
│       ├── *.spec.ts           # UI tests (26 tests)
│       └── progress-reports.spec.ts # Report UI tests (33 tests)
│
├── product-design/             # Design docs and planning
│   ├── backlog/
│   ├── notes/
│   └── architecture.md         # (this document)
│
├── index.html                  # Main app entry point
├── week.html                   # Current week view
├── progress-report.html        # Training progress analysis (JSON-based)
├── exercise.html               # Exercise detail viewer
├── README.md                   # User-facing documentation
├── ARCHITECTURE.md             # This document
├── MODERNIZATION.md            # Modernization roadmap and progress
└── tsconfig.json               # TypeScript configuration
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
