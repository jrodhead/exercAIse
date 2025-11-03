# Training Progress Report Generation Prompt

## Purpose
Generate a comprehensive, data-driven training progress report analyzing objective performance metrics across a specified time period.

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

### 3. Report Structure

#### **Executive Summary**
- Training period (dates, total weeks, blocks covered)
- Total sessions logged
- Adherence rate (sessions planned vs completed, if known)
- Key achievements (top 3-5 highlights)
- Injury/pain status

#### **Strength Progression by Movement Pattern**

For each major lift category, create a detailed progression table:

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

**Table Format (per exercise):**
| Date | Block-Week | Load | Reps × Sets | RPE | Best Set Volume | % Change |
|------|-----------|------|-------------|-----|-----------------|----------|
| [First] | X-Y | ZZ lb | R × S | N | ZZ × R = VVV lb | Baseline |
| ... | ... | ... | ... | ... | ... | +X% |
| [Peak] | X-Y | ZZ lb | R × S | N | ZZ × R = VVV lb | +X% |
| [Last] | X-Y | ZZ lb | R × S | N | ZZ × R = VVV lb | +X% |

**Summary line:**
- **Overall Progress:** [Start Load] → [Peak Load] (+X%) | **Volume:** [Start] → [Peak] (+X%)

#### **Endurance Progression**

For running, walking, cycling, or other cardio work:

| Date | Block-Week | Format | Distance | Time | Pace | RPE | Notes |
|------|-----------|--------|----------|------|------|-----|-------|
| ... | ... | Continuous/Intervals | X.X mi | MM:SS | M:SS/mi | N | ... |

**Metrics:**
- Total distance increase (%)
- Pace improvement (if applicable)
- RPE trends
- Longest continuous session

#### **Training Volume & Adherence**

**Session Distribution:**
- Count sessions by type (Upper Body, Lower Body, Full Body, Endurance, Recovery)
- Calculate sessions per week average
- Note any training gaps or missed weeks

**Block Periodization Adherence:**
- List blocks completed during reporting period
- Verify deload weeks executed (check for 15-20% load reduction)
- Identify any overreaching or undertraining periods

#### **Key Performance Indicators**

**Strength Gains Table:**
| Movement Pattern | Starting Load | Peak Load | Absolute Gain | % Increase |
|-----------------|--------------|-----------|---------------|------------|
| Squat | ... | ... | ... | ... |
| Hip Hinge | ... | ... | ... | ... |
| Horizontal Press | ... | ... | ... | ... |
| Horizontal Pull | ... | ... | ... | ... |
| ... | ... | ... | ... | ... |

**RPE Management:**
- Block-by-block RPE trends
- Identify peak weeks (RPE 8-9) vs deload weeks (RPE 5-7)
- Flag any RPE ≥ 10 instances (failure/overreaching)

**Injury Prevention:**
- Count injury-free days
- Note any pain reports
- Track joint-sensitive exercises and adaptations

#### **Detailed Observations**

**What's Working Exceptionally Well:**
1. [Exercise/pattern with highest % gains]
2. [Consistent RPE management, adherence, etc.]
3. [3-5 specific wins with data support]

**Areas Requiring Strategic Adjustment:**
1. [Plateaus: exercises with <2.5% gain over 4+ weeks]
2. [Fatigue indicators: RPE creep, rep drop-offs]
3. [Form concerns: load increases with RPE spikes]
4. [3-5 specific areas with recommendations]

#### **Periodization Analysis**

For each block in the reporting period:
- **Block X (Weeks Y-Z): [Phase Name]**
  - Focus: [e.g., Volume Accumulation, Strength Intensification]
  - Intensity: [RPE range, % of 1RM if known]
  - Volume: [Sets × reps trends]
  - Outcome: [Key gains, lessons learned]

**Overall Periodization Grade:** [A+ to D]
- Proper block progression
- Deload consistency
- Exercise variety and rotation
- Overall effectiveness

#### **Next Block Strategic Plan**

**Primary Goals:**
1. [Based on identified plateaus or weaknesses]
2. [Based on user goals]
3. [Based on injury prevention needs]

**Recommended Load Targets:**

| Exercise | Recent Peak | Next Block Start | Progression Target (Week 3) |
|----------|------------|-----------------|---------------------------|
| ... | ... | ... | ... |

**Programming Modifications:**
1. [Address plateaus with variety, weak point work]
2. [Reduce/increase volume based on recovery]
3. [Exercise substitutions if needed]
4. [Endurance/conditioning adjustments]

**Deload Strategy:**
- Week 4: Reduce loads by 15-20%
- Maintain movement quality
- Use as assessment week

#### **Recommendations for Continued Progress**

**Technical/Programming:**
- [3-5 actionable recommendations]

**Recovery & Injury Prevention:**
- [3-5 actionable recommendations]

**Progression Strategies:**
- Lower Body: [Linear, undulating, double progression]
- Upper Body: [Linear, undulating, double progression]
- Accessories: [Rep/RPE focus]
- Endurance: [Distance/pace targets]

**Tracking & Accountability:**
- [Logging improvements]
- [New metrics to track]
- [Assessment frequency]

#### **Overall Assessment**

**Grade:** [A+ to D]

**Summary:** [2-3 paragraphs covering adherence, gains, fatigue management, injury status]

**Strengths:** [Bulleted list with data support]

**Growth Opportunities:** [Bulleted list with specific recommendations]

#### **Next Actions**

**Immediate (Next 7 Days):**
1. [Specific action items]

**Short-Term (Next Block):**
1. [Week-by-week targets]

**Long-Term (3-6 months):**
1. [Strategic planning items]

---

## 4. Analysis Guidelines

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

## 5. Output Formatting

### Style Guidelines
- **Professional and coach-like tone:** Direct, evidence-based, motivating
- **Data-driven:** Every claim backed by numbers from logs
- **Actionable:** Specific recommendations, not vague advice
- **Honest:** Call out plateaus, overreaching, and areas needing work
- **Encouraging:** Highlight wins and progress, even if small

### Visual Elements
- Use tables for progression tracking (markdown format)
- Use emojis sparingly for section headers (📊, 💪, 🏃, 🎯, ✅, ❌)
- Bold key metrics and percentages
- Use bullet points for lists

### Length Targets
- **Executive Summary:** 200-300 words
- **Strength Progression:** 1 table per major exercise (5-10 exercises)
- **Detailed Observations:** 3-5 items per section
- **Overall Assessment:** 300-500 words
- **Total Report:** 2,500-4,000 words

---

## 6. Example Usage

**User Request:**
> "Generate a training progress report for Block 4"

**AI Response:**
1. Identify Block 4 date range from `performed/` logs
2. Read all `*_perf1.json` files from that period
3. Extract and analyze data per guidelines above
4. Generate comprehensive report following structure
5. Provide specific recommendations for Block 5

---

## 7. Special Cases

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

---

## 8. Post-Report Actions

After generating the report, ask the user:
1. "Would you like me to generate the first session of your next block based on these findings?"
2. "Are there any specific areas from this report you'd like to discuss further?"
3. "Should I update any training parameters or goals based on this analysis?"

---

## Notes for Kai

- **Always read the actual performance logs**—don't make up data or estimates
- **Be honest about plateaus and regression**—it's better to identify and address them early
- **Context matters**—a deload week showing "regression" is actually success
- **Individual variation**—what's "good" progress depends on training age, recovery, and goals
- **Safety first**—if data suggests overreaching or injury risk, call it out clearly
- **Celebrate wins**—even 2.5% gains are progress; acknowledge effort and consistency

---

## Version
**v1.0** - Initial comprehensive training progress report prompt
