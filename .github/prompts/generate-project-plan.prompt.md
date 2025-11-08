# Generate Project Planning Document

## Purpose
Create a comprehensive, actionable project plan for implementing a new feature, enhancement, or significant change in the exercAIse codebase.

## When to Use
- Planning a new feature that requires multiple phases
- Designing a data structure migration or breaking change
- Implementing a complex enhancement across multiple files
- Any project that requires careful coordination of code, tests, and documentation

## Instructions for AI Agent

When the user provides a feature request or enhancement idea, generate a complete project planning document following this structure:

### Document Structure

1. **📋 Project Overview**
   - Goal: One-sentence objective
   - Problem Statement: What problem does this solve? Include bullet points of specific pain points
   - Success Metrics: Concrete, measurable outcomes

2. **🔬 Phase 1: Research & Analysis**
   - 1.1 Current State Analysis: What exists today? What's the baseline?
   - 1.2 User Story Validation: Who benefits? What do they need?
   - 1.3 Design Research: What are the options? What's the recommended approach?
   - Include: Evidence from codebase, alternatives considered, decision rationale

3. **📐 Phase 2: Design & Planning**
   - 2.1 Schema Design: Complete JSON schemas or data structure definitions
   - 2.2 TypeScript Types: Complete interface/type definitions
   - 2.3 Implementation Design: Pseudo-code or detailed algorithm descriptions
   - 2.4 Testing Strategy: Unit tests, E2E tests, manual test checklists
   - 2.5 Documentation Updates: Which files need updates, what content
   - 2.6 Migration Strategy: If breaking changes, how to handle existing data

4. **🛠️ Phase 3: Implementation**
   - 3.X for each major task: Break down into day-by-day tasks with:
     - Tasks: Checkbox list of specific actions
     - Definition of Done: Clear completion criteria
   - Cover: Schema/Types, Core Logic, UI Changes, Tests, Documentation

5. **🧪 Phase 4: Testing & Validation**
   - 4.1 Automated Testing: Commands to run, what to verify
   - 4.2 Manual Testing: Step-by-step test plan with edge cases
   - 4.3 Performance Testing: Metrics to measure, acceptance criteria

6. **📏 Phase 5: Style Guide Adherence**
   - 5.1 Code Style: Language-specific conventions (TypeScript, Python, etc.)
   - 5.2 CSS/UI Style: Reference to style-guide.html (if UI changes)
   - 5.3 Schema Style: JSON Schema conventions
   - 5.4 Testing Style: Vitest and Playwright patterns
   - 5.5 Documentation Style: Markdown and code comment standards

7. **🚀 Phase 6: Deployment & Rollout**
   - 6.1 Pre-Deployment Checklist: What must be verified before shipping
   - 6.2 Deployment Steps: Git commands, CI/CD verification, production testing
   - 6.3 Post-Deployment Monitoring: What to watch, success indicators

8. **🔄 Phase 7: Integration & Iteration**
   - 7.1 Integration: How other systems (AI, UI, etc.) use this feature
   - 7.2 Iteration Opportunities: Follow-up enhancements by priority
   - 7.3 Future Enhancements: Nice-to-have features, migration scripts, analytics

9. **📊 Success Metrics & KPIs**
   - Quantitative Metrics: Numbers, percentages, time measurements
   - Qualitative Metrics: User satisfaction, code maintainability, documentation quality
   - Review Checkpoints: Day-by-day milestones

10. **🎯 Risk Management**
    - Technical Risks: Implementation challenges, performance concerns
    - Process Risks: Scope creep, insufficient testing, poor documentation
    - Data Risks: Data loss, migration failures
    - Format as tables with: Risk, Impact, Likelihood, Mitigation

11. **📝 Notes & Decisions**
    - Design Decisions: Key architectural choices and rationale
    - Open Questions & Answers: Q&A format for common concerns
    - Future Considerations: Long-term possibilities

12. **📅 Timeline Summary**
    - Table: Phase | Duration | Key Deliverables
    - Total Estimated Time: Overall timeline
    - Key Milestones: Day-by-day checkpoints with ✅/⏳ status

13. **✅ Acceptance Criteria**
    - Must Have (MVP): Non-negotiable requirements
    - Should Have (Post-MVP): Important but not blocking
    - Could Have (Future): Nice-to-have enhancements
    - Won't Have (This Phase): Explicitly out of scope

### Document Metadata (at bottom)
- Project Owner
- Created date
- Updated date
- Status (Planning | Ready for Implementation | In Progress | Complete)
- Next Steps: Specific first action to take

## Requirements for Generated Document

### Content Quality
- **Comprehensive**: Cover all aspects from research to deployment
- **Actionable**: Every task should be specific enough to execute
- **Testable**: Clear definition of done for each phase
- **Realistic**: Timelines should account for complexity
- **Risk-aware**: Identify potential problems before they occur

### Technical Depth
- **Complete schemas**: Don't use placeholders, write actual JSON Schema
- **Complete types**: Write full TypeScript interfaces, not sketches
- **Pseudo-code**: Show algorithm logic, not just descriptions
- **Test scenarios**: Specific test cases, not just "test the feature"

### Formatting
- Use emoji section markers (📋 🔬 📐 🛠️ 🧪 📏 🚀 🔄 📊 🎯 📝 📅 ✅)
- Use checkbox lists `- [ ]` for tasks
- Use status markers: ✅ (complete), ⏳ (in progress), ❌ (rejected), 🔮 (future)
- Use tables for: timeline, risks, acceptance criteria comparisons
- Use code blocks with language identifiers for all code
- Use bold for emphasis, inline code for filenames/commands

### Integration with exercAIse Architecture
Before generating the plan, **always read these files first**:
1. `ARCHITECTURE.md` - Understand system design and separation of concerns
2. `.github/copilot-instructions.md` - Understand project conventions
3. `schemas/*.schema.json` - Understand existing data contracts (if relevant)
4. `types/*.types.ts` - Understand existing TypeScript patterns (if relevant)
5. `style-guide.html` - Understand CSS/UI patterns (if UI changes)

### Questions to Ask User Before Generating

If any of these are unclear from the user's request, ask:

1. **Scope**: Is this a new feature, enhancement, refactor, or migration?
2. **Breaking Changes**: Is backward compatibility required?
3. **Data Impact**: What existing data is affected? Is data loss acceptable?
4. **Timeline**: Is there a deadline or urgency level?
5. **Dependencies**: Does this depend on or affect other planned work?
6. **Testing Priority**: What level of test coverage is needed? (basic, thorough, comprehensive)
7. **Documentation Priority**: What docs need updates? (inline, README, ARCHITECTURE, AI instructions)

### Output Location

Save the planning document to:
```
product-design/backlog/<feature-name-in-kebab-case>.md
```

Example: `product-design/backlog/structure-tracking-in-perf-logs.md`

## Example Usage

**User**: "I want to add support for tracking tempo (e.g., 3-1-1-0) in performance logs"

**AI Agent**:
1. Reads ARCHITECTURE.md, schemas/performed.schema.json, types/performance.types.ts
2. Asks clarifying questions about backward compatibility, data migration
3. Generates complete plan document with:
   - Current state analysis (tempo not tracked today)
   - Schema updates (add `tempo?: string` field)
   - TypeScript types (add to SetEntry, ExercisePerformance)
   - Form builder changes (add tempo input field)
   - Validation logic (parse tempo format: N-N-N-N)
   - Testing strategy (unit + E2E tests)
   - Timeline (3-5 days)
   - Risk management (user confusion about tempo notation)
4. Saves to `product-design/backlog/tempo-tracking.md`
5. Reports: "Planning document created. Ready to begin Phase 3.1 (Schema & Types)?"

## Quality Checklist

Before considering the planning document complete, verify:

- [ ] All 13 sections present and complete
- [ ] Schemas are valid JSON (not pseudo-schema)
- [ ] TypeScript types compile (no syntax errors)
- [ ] Timeline is realistic (not overly optimistic)
- [ ] Risks identified with concrete mitigations
- [ ] Acceptance criteria are testable
- [ ] Dependencies on other files/systems identified
- [ ] Breaking changes explicitly called out
- [ ] Migration strategy included (if applicable)
- [ ] AI integration guidance included (if affects AI decisions)
- [ ] Document saved to correct location

## Notes

- **Bias toward action**: Plans should enable starting work immediately, not block on uncertainty
- **Evolving documents**: Plans can be updated as work progresses and new information emerges
- **Learning resource**: Plans serve as documentation of architectural decisions for future reference
- **Communication tool**: Plans help user understand scope, effort, and trade-offs before committing to work

---

**Template Version**: 1.0  
**Created**: November 7, 2025  
**Last Updated**: November 7, 2025  
**Based on**: structure-tracking-in-perf-logs.md (exemplar project plan)
