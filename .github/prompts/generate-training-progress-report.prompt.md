# Training Progress Report Generation Prompt

## Purpose
Generate a comprehensive, data-driven training progress report as structured JSON data analyzing objective performance metrics across a specified time period.

## CRITICAL: Output Format
**You MUST generate a JSON file, not HTML.** The JSON structure is defined by `schemas/progress-report.schema.json`. The app will render the JSON data using the design system.

**Architecture Principle**: AI decides (analysis, insights, recommendations) → App executes (rendering, styling, display)

## Instructions for AI (Kai)

### 1. Determine Reporting Period
- **Ask the user for the time range:**
  - Start date (or "from beginning")
  - End date (or "to present")
  - Specific blocks/weeks (e.g., "Block 3 through Block 4")
  
- **Default if not specified:** Last 4 weeks (1 complete block)

### 2. Data Collection Phase
Read all performance logs in `performed/` directory within the specified time range:
- Identify all relevant `*_perf1.json` files based on timestamps
- Extract exercise names, loads, reps, sets, RPE data
- Capture endurance metrics (distance, time, pace)
- Note any pain/injury comments

**Key data to collect per exercise:**
- First recorded instance (baseline)
- Last recorded instance (current)
- Peak performance (highest load × reps volume)
- RPE trends across the period
- Total volume progression

### 3. JSON Schema Reference

**Before generating the report, read the schema**: `schemas/progress-report.schema.json`

**CRITICAL SCHEMA RULES**:
1. **Exercise Progression Tables**: Must use EXACT column names: `["Exercise", "First Session", "Peak Performance", "Volume Change", "Sessions"]`
   - Row fields: `exercise`, `firstSession`, `peakPerformance`, `volumeChange`, `volumeChangeSentiment`, `sessions`
   - The renderer maps column names to row fields - custom names will not display!
2. **Generic Tables**: Use any column names, but rows must be arrays of strings matching column count
3. **Content Arrays**: Must specify `type: "paragraph"` or `type: "list"` for each item
4. **Sentiments**: Use only `"positive"`, `"neutral"`, `"negative"` (or `"warning"` for highlight boxes)

The report JSON has this top-level structure:
```json
{
  "version": "1.0",
  "metadata": {
    "title": "Training Progress Report - Blocks X-Y",
    "period": {
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "blockRange": "X-Y",
      "weeks": 10.5
    },
    "generatedDate": "YYYY-MM-DD"
  },
  "summary": {
    "grade": "A",
    "kpis": [ /* stat cards */ ],
    "highlights": [ /* key achievements */ ],
    "injuryStatus": "..."
  },
  "sections": [ /* analysis sections */ ]
}
```

**Section Types Available:**
- `strength-analysis`: Exercise progression tables grouped by movement pattern
- `table`: Generic data tables (endurance, volume, KPIs)
- `text`: Multi-paragraph text sections with lists
- `highlight-box`: Callout boxes with sentiment (positive/warning/neutral)
- `kpi-grid`: Grid of KPI stat cards

**See Example Report**: `reports/2025-11-03_blocks-2-4.json` for complete structure

### 4. Report Content & Analysis

### 4. Report Content & Analysis

#### **Metadata Section**
Required fields:
- `title`: "Training Progress Report - Blocks X-Y"
- `period.startDate`, `period.endDate`: YYYY-MM-DD format
- `period.blockRange`: "X-Y" (e.g., "2-4", "4-4")
- `period.weeks`: Total training weeks (can be decimal like 10.5)
- `generatedDate`: Today's date in YYYY-MM-DD format

#### **Summary Section**
- `grade`: Overall assessment (A, A-, B+, B, B-, C+, C, C-, D, F)
- `kpis`: 4-6 key performance indicators with `label`, `value`, `sentiment`
  - Examples: "Total Sessions", "Training Weeks", "Adherence Rate", "Blocks Completed"
- `highlights`: 5-8 bullet points of key achievements (include emoji for visual interest)
  - Format: "💪 Exercise: +X% gain, specific metric details"
- `injuryStatus`: Injury-free status or pain notes summary

#### **Sections: Strength Progression by Movement Pattern** (type: "strength-analysis")
#### **Sections: Strength Progression by Movement Pattern** (type: "strength-analysis")

**CRITICAL**: Always use these EXACT column names for exercise progression tables:
- `["Exercise", "First Session", "Peak Performance", "Volume Change", "Sessions"]`
- Row fields: `exercise`, `firstSession`, `peakPerformance`, `volumeChange`, `volumeChangeSentiment`, `sessions`
- **DO NOT** use custom column names like "Block 4 Peak", "Load Change", "Status" - they will not render!

Group exercises by movement pattern and create subsections:

**Lower Body Primary:**
- Squat variations (Goblet, Box, Back, Front)
- Hip Hinge variations (RDL, Deadlift, Single-Leg)
- Unilateral movements (Bulgarian Split Squat, Lunges, Step-ups)
- Calves (Standing/Seated Calf Raise)

**Upper Body Primary:**
- Horizontal Press (Bench variations, Push-ups)
- Vertical Press (Overhead Press, Landmine Press)
- Horizontal Pull (Rows: One-Arm, Chest-Supported, Barbell)
- Vertical Pull (Pull-ups, Lat Pulldown)

**Accessories:**
- Biceps (Curls, Hammer Curls)
- Triceps (Extensions, Dips, Close-Grip Press)
- Shoulders (Lateral Raises, Face Pulls, Reverse Flyes)
- Core (Planks, Dead Bugs, Pallof Press, Carries)

**JSON Structure:**
```json
{
  "type": "strength-analysis",
  "title": "💪 Strength Progression by Movement Pattern",
  "subsections": [
    {
      "subtitle": "Lower Body Primary Movements",
      "table": {
        "type": "exercise-progression",
        "columns": ["Exercise", "First Session", "Peak Performance", "Volume Change", "Sessions"],
        "rows": [
          {
            "exercise": "Goblet Squat",
            "firstSession": "55 lb × 8 (Aug 23)",
            "peakPerformance": "67.5 lb × 8 (Oct 23)",
            "volumeChange": "+22.7%",
            "volumeChangeSentiment": "positive",
            "sessions": "10"
          }
        ]
      },
      "observation": "Analysis paragraph summarizing movement pattern progression..."
    }
  ]
}
```

**Volume Change Calculation:**
- `volumeChange`: Percentage or descriptive ("+22.7%", "Added external load", "Maintained")
- `volumeChangeSentiment`: "positive" (green), "neutral" (gray), "negative" (red)

#### **Sections: Endurance Progression** (type: "table")

For running, walking, cycling:
```json
{
  "type": "table",
  "title": "🏃 Endurance Progression",
  "table": {
    "type": "generic",
    "columns": ["Date", "Workout", "Distance", "Time", "Pace", "RPE"],
    "rows": [
      ["Aug 26", "Easy Run", "4.0 mi", "30:34", "7:39/mi", "4.5"],
      ["Sep 2", "Easy Run", "4.0 mi", "31:52", "7:58/mi", "4.0"]
    ]
  },
  "summary": "Analysis paragraph about endurance trends..."
}
```

#### **Sections: Training Volume & Adherence** (type: "table" + "text")

Session distribution table:
```json
{
  "type": "table",
  "title": "📈 Training Volume & Adherence",
  "subtitle": "Session Distribution",
  "table": {
    "type": "generic",
    "columns": ["Session Type", "Count", "Percentage"],
    "rows": [
      ["Upper Body Strength", "15", "34.1%"],
      ["Lower Body Strength", "10", "22.7%"]
    ]
  }
}
```

Weekly adherence text section:
```json
{
  "type": "text",
  "title": "Weekly Adherence",
  "content": [
    {
      "type": "list",
      "ordered": false,
      "items": [
        "Average Sessions Per Week: 4.2",
        "Peak Week: 5 sessions (multiple weeks)",
        "Training Gaps: Minimal - no gaps longer than 3-4 days"
      ]
    }
  ]
}
```

#### **Sections: Periodization Analysis** (type: "text")

Block-by-block analysis:
```json
{
  "type": "text",
  "title": "📅 Periodization Analysis",
  "content": [
    {
      "type": "paragraph",
      "text": "Block 2 (Weeks 2-4): Aug 22 - Sep 8"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        "Focus: Volume accumulation, movement pattern reinforcement",
        "Intensity: Moderate (RPE 6-8)",
        "Key Lifts: Neutral-Grip Bench 2×45-47.5 lb, Goblet Squat 55-57.5 lb",
        "Outcome: Solid foundation established, full deload executed in Week 4"
      ]
    }
  ]
}
```

#### **Sections: Key Performance Indicators** (type: "table")

Gains summary table:
```json
{
  "type": "table",
  "title": "🎯 Key Performance Indicators",
  "table": {
    "type": "generic",
    "columns": ["Movement Pattern", "Representative Exercise", "Starting Load", "Peak Load", "Gain", "% Increase"],
    "rows": [
      ["Squat Pattern", "Goblet Squat", "55 lb", "67.5 lb", "+12.5 lb", "+22.7%"],
      ["Hip Hinge", "DB Romanian Deadlift", "2×55 lb", "2×67.5 lb", "+12.5 lb/side", "+22.7%"]
    ]
  }
}
```

#### **Sections: Detailed Observations** (type: "text" + "highlight-box")

What's working well:
```json
{
  "type": "text",
  "title": "🔍 Detailed Observations",
  "content": [
    {
      "type": "paragraph",
      "text": "What's Working Exceptionally Well"
    },
    {
      "type": "list",
      "ordered": true,
      "items": [
        "Arm Development: Hammer Curls (+140%), Biceps Curls (+120%) - exceptional hypertrophy response",
        "Unilateral Leg Work: Bulgarian Split Squats (+52% volume, +90% raw load)",
        "Pulling Strength: One-Arm Row (+57% raw load) and Chest-Supported Row (+50% volume)"
      ]
    },
    {
      "type": "paragraph",
      "text": "Areas Requiring Strategic Adjustment"
    },
    {
      "type": "list",
      "ordered": true,
      "items": [
        "Vertical Pulling Deficit: No chin-ups or lat pulldowns logged. Add to next block",
        "Hip Hinge Plateau Potential: Consider variation (single-leg RDL, trap bar deadlift)",
        "Bench Press Intensity Spikes: Several RPE 10 instances - need better auto-regulation"
      ]
    }
  ]
}
```

Highlight boxes for key insights:
```json
{
  "type": "highlight-box",
  "title": "Key Observation",
  "sentiment": "positive",
  "content": [
    {
      "type": "paragraph",
      "text": "Excellent consistency with 4+ sessions per week maintained throughout. Programming emphasized upper body development (34% of sessions), balanced with lower body work (23%) and conditioning (18%)."
    }
  ]
}
```

**Sentiment Values:**
- `"positive"`: Green styling for achievements, wins, good news
- `"neutral"`: Gray styling for neutral observations
- `"warning"`: Yellow/orange styling for areas needing attention

#### **Sections: Next Block Strategic Plan** (type: "text" + "table")

Goals and recommendations:
```json
{
  "type": "text",
  "title": "🎯 Next Block Strategic Plan (Block X)",
  "content": [
    {
      "type": "paragraph",
      "text": "Primary Goals"
    },
    {
      "type": "list",
      "ordered": true,
      "items": [
        "Consolidate strength gains from Block 4, target +2.5-5% on major lifts",
        "Address vertical pulling deficit - add chin-ups or lat pulldowns",
        "Continue arm development momentum with sustained volume"
      ]
    }
  ]
}
```

Load targets table:
```json
{
  "type": "table",
  "title": "Recommended Load Targets (Week 1 Starting Points)",
  "table": {
    "type": "generic",
    "columns": ["Exercise", "Block X Peak", "Block Y Week 1 Start", "Block Y Week 3 Target"],
    "rows": [
      ["Goblet Squat", "67.5 lb × 8", "60-62.5 lb × 8", "70 lb × 8"],
      ["DB Romanian Deadlift", "2×67.5 lb × 8", "2×60 lb × 10", "2×70 lb × 8"]
    ]
  }
}
```

#### **Sections: Recommendations** (type: "text")

Technical, recovery, progression, and tracking recommendations:
```json
{
  "type": "text",
  "title": "💡 Recommendations for Continued Progress",
  "content": [
    {
      "type": "paragraph",
      "text": "Technical/Programming"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        "✅ Maintain current 4x weekly training frequency - excellent adherence",
        "✅ Continue 4-week block structure with Week 4 deloads",
        "⚠️ Add vertical pulling (chin-ups/lat pulldowns) to prevent imbalances"
      ]
    },
    {
      "type": "paragraph",
      "text": "Recovery & Injury Prevention"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        "✅ Continue injury-free training approach",
        "⚠️ Increase core training frequency to 2-3x per week"
      ]
    }
  ]
}
```

#### **Sections: Overall Assessment** (type: "highlight-box")

Final grade and summary:
```json
{
  "type": "highlight-box",
  "title": "📊 Overall Assessment - Grade: A",
  "sentiment": "positive",
  "content": [
    {
      "type": "paragraph",
      "text": "Outstanding Progress Across All Metrics"
    },
    {
      "type": "paragraph",
      "text": "This 10.5-week training block represents an exemplary mesocycle with exceptional consistency... [detailed analysis]"
    },
    {
      "type": "paragraph",
      "text": "Strengths"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        "✅ Exceptional consistency - 44 sessions over 10.5 weeks",
        "✅ Outstanding arm development - +120-140% volume increases"
      ]
    },
    {
      "type": "paragraph",
      "text": "Growth Opportunities"
    },
    {
      "type": "list",
      "ordered": false,
      "items": [
        "⚠️ Add vertical pulling for balanced back development",
        "⚠️ Increase core training frequency to 2-3x per week"
      ]
    }
  ]
}
```

#### **Sections: Next Actions** (type: "text")

Immediate, short-term, and long-term action items:
```json
{
  "type": "text",
  "title": "✅ Next Actions",
  "content": [
    {
      "type": "paragraph",
      "text": "Immediate (Next 7 Days) - Block X Week 1 Launch"
    },
    {
      "type": "list",
      "ordered": true,
      "items": [
        "Design Block X Week 1 programming with vertical pull addition",
        "Set Week 1 starting loads at 85-90% of previous peaks",
        "Add dedicated core work to each session"
      ]
    },
    {
      "type": "paragraph",
      "text": "Short-Term (Block X - Next 4 Weeks)"
    },
    {
      "type": "list",
      "ordered": true,
      "items": [
        "Week 1: Re-introduce movements at 85-90% loads, RPE 6-7",
        "Week 2: Progressive overload to 95-100% of previous peaks",
        "Week 3: Peak week - attempt +2.5-5% on major lifts"
      ]
    }
  ]
}
```

---

## 5. Analysis Guidelines

### Load Progression Calculations
- **% Change:** `((New Load - Old Load) / Old Load) × 100`
- **Volume:** `Weight × Reps × Sets` (for single best set or total session)
- **Relative Intensity:** Use RPE as proxy for % 1RM
  - RPE 5-6 ≈ 60-70%
  - RPE 7-8 ≈ 75-85%
  - RPE 9-10 ≈ 90-100%

### Progression Benchmarks
- **Excellent:** >10% gain per block (4 weeks)
- **Good:** 5-10% gain per block
- **Maintenance:** 0-5% gain per block
- **Regression:** <0% (flag for investigation)

### Deload Verification
- **Proper deload:** 15-20% load reduction OR same load with 2-3 fewer reps
- **RPE in deload week:** Should be 5-7 (not pushed to failure)

### Red Flags to Identify
- ❌ **Overreaching:** RPE ≥ 9 for 2+ consecutive weeks without deload
- ❌ **Plateau:** Same load for 3+ weeks with no rep increase
- ❌ **Form breakdown:** Load increase with RPE spike >2 points
- ❌ **Injury risk:** Pain notes, asymmetric strength, excessive volume jumps

### Green Flags to Highlight
- ✅ **Smart progression:** Steady 2.5-5% load increases every 1-2 weeks
- ✅ **RPE discipline:** Peak weeks at RPE 8-9, deloads at RPE 5-7
- ✅ **Consistency:** No training gaps >1 week
- ✅ **Balanced development:** All movement patterns progressing

---

## 6. File Creation & Validation

### Output Format
**CRITICAL**: You MUST create a JSON file, not HTML.

### File Naming Convention
`reports/YYYY-MM-DD_blocks-X-Y.json`

Examples:
- `reports/2025-11-03_blocks-2-4.json` (Blocks 2-4 report generated on Nov 3, 2025)
- `reports/2025-12-01_blocks-4-4.json` (Block 4 only report generated on Dec 1, 2025)

### Validation Steps
After generating the JSON:
1. **Validate against schema**: Run `python3 scripts/validate_schemas.py`
2. **Check structure**: Ensure all required fields are present (version, metadata, summary, sections)
3. **Verify data**: No placeholders like "...", "[TBD]", or "TODO"
4. **Test rendering**: Open `progress-report.html` in browser to verify visual rendering

### Update Manifest
After creating the report JSON, update `reports/index.json`:
```json
{
  "version": "2.0",
  "reports": [
    {
      "date": "2025-11-03",
      "title": "Training Progress Report - Blocks 2-4",
      "file": "2025-11-03_blocks-2-4.json",
      "period": {
        "startDate": "2025-08-22",
        "endDate": "2025-11-03",
        "blockRange": "2-4",
        "weeks": 10.5
      }
    }
  ]
}
```

---

## 7. Example Usage

**User Request:**
> "Generate a training progress report for Block 4"

**AI Response Workflow:**
1. Read `schemas/progress-report.schema.json` to understand structure
2. Identify Block 4 date range from `performed/` logs
3. Read all `*_perf1.json` files from that period
4. Extract and analyze data per guidelines above
5. Generate JSON following schema structure
6. Create file `reports/YYYY-MM-DD_blocks-4-4.json`
7. Validate with `python3 scripts/validate_schemas.py`
8. Update `reports/index.json` manifest
9. Confirm with user that report is ready to view

---

## 8. Special Cases

### Incomplete Data
- If RPE not logged: Note "RPE not recorded" in tables
- If exercises only appear once: Mark as "Baseline established, awaiting follow-up"
- If gaps in training: Note in Adherence section, investigate causes

### Exercise Variations
- Group similar exercises together (e.g., "Goblet Squat" and "Box Goblet Squat")
- Note when exercise substitutions occur
- Track progression across variations if loads are comparable

### Injury/Pain Notes
- Highlight any sessions with pain comments
- Correlate with load/volume changes
- Provide conservative recommendations if pain noted

### Multiple Training Goals
- If both strength and endurance are primary: Give equal weight to both sections
- If hypertrophy focus: Emphasize volume trends over pure strength
- If sport-specific: Relate findings to sport demands

## 8. Special Cases

### Incomplete Data
- If RPE not logged: Use empty string "" or omit from table
- If exercises only appear once: Mark as baseline, include in "firstSession" field only
- If gaps in training: Note in adherence text section, investigate causes

### Exercise Variations
- Group similar exercises together (e.g., "Goblet Squat" and "Box Goblet Squat")
- Note when exercise substitutions occur in observations
- Track progression across variations if loads are comparable

### Injury/Pain Notes
- Highlight any sessions with pain comments in `injuryStatus` field
- Create warning highlight boxes if pain correlates with load/volume changes
- Provide conservative recommendations in next block plan

### Multiple Training Goals
- If both strength and endurance are primary: Give equal weight to both sections
- If hypertrophy focus: Emphasize volume trends over pure strength
- If sport-specific: Relate findings to sport demands

---

## 9. Post-Report Actions

After generating the report JSON and updating the manifest, ask the user:
1. "Report generated and saved to `reports/YYYY-MM-DD_blocks-X-Y.json`. Would you like me to open it in your browser?"
2. "Would you like me to generate the first session of your next block based on these findings?"
3. "Are there any specific areas from this report you'd like to discuss further?"
4. "Should I update any training parameters or goals based on this analysis?"

---

## 10. Notes for Kai

- **Always generate JSON, never HTML** - The app handles all rendering and styling
- **Always read the actual performance logs** - Don't make up data or estimates
- **Validate against schema** - Run `python3 scripts/validate_schemas.py` before finalizing
- **Be honest about plateaus and regression** - It's better to identify and address them early
- **Context matters** - A deload week showing "regression" is actually success
- **Individual variation** - What's "good" progress depends on training age, recovery, and goals
- **Safety first** - If data suggests overreaching or injury risk, call it out clearly
- **Celebrate wins** - Even 2.5% gains are progress; acknowledge effort and consistency
- **Follow the schema** - Use exact field names and structure from `schemas/progress-report.schema.json`
- **No placeholders** - All data must be real; no "..." or "[TBD]" in final JSON
- **CRITICAL: Column Names** - Exercise progression tables MUST use: `["Exercise", "First Session", "Peak Performance", "Volume Change", "Sessions"]`

### Pre-Submission Validation Checklist

Before finalizing the report, verify:
- [ ] All exercise progression tables use standard column names (not custom descriptive names)
- [ ] Row fields match schema: `exercise`, `firstSession`, `peakPerformance`, `volumeChange`, `volumeChangeSentiment`, `sessions`
- [ ] All generic tables have rows as arrays of strings matching column count
- [ ] All content items have `type: "paragraph"` or `type: "list"`
- [ ] Sentiments use only: `"positive"`, `"neutral"`, `"negative"`, `"warning"`
- [ ] Schema validation passes: `python3 scripts/validate_schemas.py`
- [ ] No placeholder text like "...", "[TBD]", "TODO"
- [ ] All dates in YYYY-MM-DD format
- [ ] Block range format: "X-Y" (e.g., "2-4", "5-5")

---

## Version
**v2.1** - Added critical column name validation and pre-submission checklist

**Migration Note**: Old HTML reports are archived in `reports/archive/`. New reports are JSON-only, rendered by `assets/progress-report-renderer.ts` using the app's design system.
```

## 9. Post-Report Actions

After generating the report JSON and updating the manifest, ask the user:
1. "Report generated and saved to `reports/YYYY-MM-DD_blocks-X-Y.json`. Would you like me to open it in your browser?"
2. "Would you like me to generate the first session of your next block based on these findings?"
3. "Are there any specific areas from this report you'd like to discuss further?"
4. "Should I update any training parameters or goals based on this analysis?"

---

## 10. Notes for Kai

- **Always read the actual performance logs**—don't make up data or estimates
- **Be honest about plateaus and regression**—it's better to identify and address them early
- **Context matters**—a deload week showing "regression" is actually success
- **Individual variation**—what's "good" progress depends on training age, recovery, and goals
- **Safety first**—if data suggests overreaching or injury risk, call it out clearly
- **Celebrate wins**—even 2.5% gains are progress; acknowledge effort and consistency

---

## Version
**v1.0** - Initial comprehensive training progress report prompt
