# CSS Refactoring Plan

**Status:** In Progress  
**Last Updated:** October 29, 2025  
**Current CSS Lines:** 2,900 (after adding section markers)

---

## ✅ Completed Tasks

### 1. Dark Mode Consolidation ✅
- **Status:** COMPLETE
- **What was done:**
  - Consolidated 11 scattered `@media (prefers-color-scheme: dark)` blocks into 1 comprehensive section at line 2245
  - Fixed inverted color variables (--color-gray-100 now #f8fafc bright, not dark)
  - Reduced CSS from 3,099 lines to 2,838 lines (261 lines removed)
  - All dark mode styles now in one place for easy maintenance
- **Validation:** ✅ All tests pass, WCAG AA compliant

### 2. Table of Contents Added ✅
- **Status:** COMPLETE
- **What was done:**
  - Added comprehensive TOC at top of `styles.css` with line number references
  - Organized into 9 major sections with clear navigation
  - Easy to jump to any section via search
- **File:** `assets/styles.css` lines 1-63

### 3. Section Markers Added ✅
- **Status:** COMPLETE
- **What was done:**
  - Added 8 major section dividers throughout the file:
    - Section 1: Design Tokens (CSS Variables) - Line 5
    - Section 2: Base Styles & Typography - Line 150
    - Section 3: Layout Components - Line 280
    - Section 4: Form Elements - Line 420
    - Section 5: Components - Line 565
    - Section 5B: Page-Specific Styles - Line 680
    - Section 7: Utility Classes - Line 1180
    - Section 8: Responsive Breakpoints - Line 1270
    - Section 9: Dark Mode - Line 2245
  - Clear visual separation with `/* ====== */` headers
- **Validation:** ✅ Build succeeds, all lint passes

### 4. Style Guide Documentation ✅
- **Status:** COMPLETE
- **What was done:**
  - Created `style-guide.html` - interactive living documentation
  - Live component examples with actual CSS rendering
  - Comprehensive sections: Colors, Typography, Spacing, Buttons, Cards, Forms, Lists, Badges, RPE, Progress, Tables
  - Accessibility checklist with WCAG AA requirements
  - Testing tools reference (Lighthouse, axe, WAVE, VoiceOver, NVDA)
  - Do's/Don'ts with code examples
  - Auto dark mode support
- **File:** `style-guide.html`
- **README updated:** ✅ Linked in Documentation section

### 5. Backup Created ✅
- **Status:** COMPLETE
- **File:** `assets/styles.css.backup` (original 2,838 line version)

---

## 🚧 Pending Tasks

### Priority 1: Remove Legacy Code
**Status:** NOT STARTED  
**Estimated Impact:** Remove ~50-100 lines

**Tasks:**
1. **Remove legacy RPE scale styles** (line ~763)
   - Comment says "Legacy rpe-scale styles (remove these)"
   - Already replaced by RPE table/card components
   - Safe to remove

2. **Clean up duplicate comments**
   - "Professional Typography System" appears multiple times
   - Consolidate under Section 2

3. **Remove unused classes**
   - Search for classes not used in HTML/TypeScript
   - Document findings before removal

**Command to find legacy code:**
```bash
grep -n "Legacy\|remove these\|TODO\|FIXME\|deprecated" assets/styles.css
```

---

### Priority 2: Apply Consistent BEM Naming
**Status:** NOT STARTED  
**Estimated Impact:** Rename ~50-80 classes

**Current Issues:**
- Mix of BEM-style (`.exercise-card__header`) and flat (`.workout-list`)
- No consistent modifier pattern (`.button.primary` vs `.button--primary`)
- Utilities mixed with components

**Recommended Pattern:**
```css
/* Component: Block */
.exercise-card { }

/* Component: Element */
.exercise-card__header { }
.exercise-card__title { }
.exercise-card__prescription { }
.exercise-card__notes { }

/* Component: Modifier */
.exercise-card--compact { }
.exercise-card--readonly { }
.exercise-card--collapsed { }
```

**Classes to Rename:**
1. `.exercise-card .exercise-header` → `.exercise-card__header`
2. `.exercise-card .exercise-notes` → `.exercise-card__notes`
3. `.exercise-card.compact` → `.exercise-card--compact`
4. `.exercise-card.readonly` → `.exercise-card--readonly`
5. `.exercise-card.collapsed` → `.exercise-card--collapsed`
6. `button.primary` → `.button--primary`
7. `button.secondary` → `.button--secondary`
8. `button.danger` → `.button--danger`

**Files to Update After Renaming:**
- `assets/app.ts`
- `assets/form-builder.ts`
- `assets/exercise.ts`
- `index.html`
- `exercise.html`
- All workout JSON files (if they reference classes)

**Migration Strategy:**
1. Add new BEM classes alongside old classes (don't remove old yet)
2. Update TypeScript/HTML to use new classes
3. Test thoroughly
4. Remove old classes once confirmed safe

---

### Priority 3: Add Utility Class Prefixes
**Status:** NOT STARTED  
**Estimated Impact:** Rename ~30-40 utility classes

**Current Utilities (no prefix):**
```css
.mb-2, .mb-3, .mb-4, .mb-6, .mb-8
.mt-1, .mt-2, .mt-3, .mt-4, .mt-6, .mt-8
.p-4, .p-6, .py-2, .py-3, .px-4, .px-6
.text-sm, .text-base, .text-lg, .text-xl, .text-2xl
.font-medium, .font-semibold, .font-bold
.text-center, .text-left, .text-right
.hidden, .sm-hidden, .md-hidden, .lg-hidden
.flex, .flex-col, .flex-wrap
.gap-1, .gap-2, .gap-3, .gap-4, .gap-6
```

**Proposed Naming (with `u-` prefix):**
```css
/* Spacing utilities */
.u-mb-2, .u-mb-3, .u-mb-4, .u-mb-6, .u-mb-8
.u-mt-1, .u-mt-2, .u-mt-3, .u-mt-4, .u-mt-6, .u-mt-8
.u-p-4, .u-p-6, .u-py-2, .u-py-3, .u-px-4, .u-px-6

/* Typography utilities */
.u-text-sm, .u-text-base, .u-text-lg, .u-text-xl, .u-text-2xl
.u-font-medium, .u-font-semibold, .u-font-bold
.u-text-center, .u-text-left, .u-text-right

/* Display utilities */
.u-hidden
.u-sm-hidden, .u-md-hidden, .u-lg-hidden

/* Layout utilities */
.u-flex, .u-flex-col, .u-flex-wrap
.u-gap-1, .u-gap-2, .u-gap-3, .u-gap-4, .u-gap-6
```

**Alternative:** Keep utilities unprefixed for brevity (common in Tailwind-style systems)
- Debate: `u-mb-4` vs `.mb-4`
- Decision needed before proceeding

---

### Priority 4: Add Layout Prefixes
**Status:** NOT STARTED  
**Estimated Impact:** Rename ~10-15 layout classes

**Current Layout Classes:**
```css
.container
.container-lg
.responsive-container
.grid, .grid-2, .grid-3, .grid-4
.flex, .flex-col, .flex-wrap
```

**Proposed with `l-` prefix:**
```css
.l-container
.l-container-lg
.l-container-responsive
.l-grid, .l-grid-2, .l-grid-3, .l-grid-4
```

**Note:** `.flex` might stay as utility (see Priority 3 decision)

---

### Priority 5: Add State Prefixes
**Status:** NOT STARTED  
**Estimated Impact:** Add ~5-10 new state classes

**Current State Handling:**
- Some use classes: `.disabled`, `.active`, `.collapsed`
- Some use modifiers: `.exercise-card.readonly`

**Proposed Consistent Pattern:**
```css
/* State classes (prefix with is- or has-) */
.is-active
.is-disabled
.is-loading
.is-collapsed
.is-readonly
.has-error
.has-focus
```

**Usage:**
```html
<!-- Before -->
<div class="exercise-card collapsed readonly">

<!-- After (BEM + state) -->
<div class="exercise-card is-collapsed is-readonly">
```

---

### Priority 6: Reorganize Components Alphabetically
**Status:** NOT STARTED  
**Estimated Impact:** Reorder ~1,000 lines

**Current State:**
Components scattered throughout file in order they were added

**Proposed Structure (within Section 5: Components):**
```css
/* ======================================================================
   5. COMPONENTS
   ====================================================================== */

/* ----- Badges ----- */
.badge { }
.exercise-badge { }
.exercise-pill { }

/* ----- Buttons ----- */
.button { }
.button--primary { }
.button--secondary { }
.button--danger { }
.remove-set-btn { }

/* ----- Cards ----- */
.card { }
.exercise-card { }
.exercise-card__header { }
.exercise-card__title { }
.exercise-card__prescription { }
.exercise-card__notes { }
.exercise-card--compact { }
.exercise-card--readonly { }
.rpe-card { }
.stat-card { }

/* ----- Forms ----- */
.form { }
.form__label { }
.form__input { }
.form__hint { }
.form__actions { }
.set-row { }
.set-row__label { }
.set-row__input { }

/* ----- Header & Navigation ----- */
.site-header { }
.site-header__title { }
.site-header__nav { }
.site-footer { }

/* ----- Lists ----- */
.workout-list { }
.workout-list__item { }
.workout-list__link { }
.history-list { }
.history-list__item { }

/* ----- Modals & Toasts ----- */
.toast-container { }
.toast { }
.toast--success { }
.toast--error { }
.toast--warning { }

/* ----- Progress Indicators ----- */
.progress-container { }
.progress-bar { }
.progress-text { }
.loading-skeleton { }
.shimmer { }
.spinner { }

/* ----- RPE Components ----- */
.rpe-table { }
.rpe-table__number { }
.rpe-scale { }
.rpe-item { }
.rpe-item--light { }
.rpe-item--moderate { }
.rpe-item--hard { }
.rpe-item--max { }
.rpe-meter { }
.rpe-indicator { }

/* ----- Status Messages ----- */
.status { }
.status--success { }
.status--warning { }
.status--error { }
.status--info { }

/* ----- Tables ----- */
.rpe-table { }
.rpe-table th { }
.rpe-table td { }

/* ----- Week View ----- */
.week-sessions { }
.day-group { }
.day-group--today { }
```

**Migration Note:**
This is a large refactor. Recommend doing incrementally:
1. Move one component group at a time
2. Test after each move
3. Commit frequently

---

### Priority 7: Consolidate Media Queries
**Status:** PARTIAL (some inline, some at end)  
**Estimated Impact:** Reorganize ~200 lines

**Current Issues:**
- Some components have inline media queries
- Some responsive overrides at end of file (line ~1270)
- Inconsistent breakpoint patterns

**Proposed Structure:**
Keep responsive overrides in Section 8, but ensure consistency:

```css
/* ======================================================================
   8. RESPONSIVE BREAKPOINTS (Mobile-First)
   ====================================================================== */

/* Small devices (phones, up to 640px) */
@media (max-width: 640px) {
  /* All mobile overrides here */
}

/* Medium devices (tablets, 641px to 768px) */
@media (min-width: 641px) and (max-width: 768px) {
  /* All tablet overrides here */
}

/* Large devices (desktops, 1024px and up) */
@media (min-width: 1024px) {
  /* All desktop enhancements here */
}

/* Print */
@media print {
  /* Print-specific styles */
}
```

**Decision Needed:**
- Keep component-specific media queries with components? OR
- Move all media queries to Section 8?
- Trade-off: Co-location vs. centralization

---

### Priority 8: Create CSS Linting Rules
**Status:** NOT STARTED  
**Estimated Impact:** Add stylelint configuration

**Goal:**
Automatically enforce naming conventions and best practices

**Tasks:**
1. Install stylelint: `npm install --save-dev stylelint stylelint-config-standard`
2. Create `.stylelintrc.json`:
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "selector-class-pattern": [
      "^([a-z][a-z0-9]*)((--?|__)[a-z0-9]+)*$|^(u|l|is|has|js)-[a-z0-9-]+$",
      {
        "message": "Use BEM naming: .block__element--modifier or prefixes: u-, l-, is-, has-, js-"
      }
    ],
    "max-nesting-depth": 3,
    "declaration-no-important": true,
    "selector-max-id": 0,
    "color-hex-length": "long",
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$"
  }
}
```

3. Add to `package.json`:
```json
{
  "scripts": {
    "lint:css": "stylelint \"assets/**/*.css\"",
    "lint:css:fix": "stylelint \"assets/**/*.css\" --fix"
  }
}
```

4. Add to CI/CD pipeline in `.github/workflows/`

---

### Priority 9: Document Component Usage
**Status:** NOT STARTED (partial documentation in style-guide.html)

**Goal:**
Comprehensive component documentation for developers

**Tasks:**
1. **Expand `style-guide.html`** with:
   - Component composition examples
   - When to use each component
   - Accessibility requirements per component
   - Mobile-specific behavior

2. **Create `docs/CSS-COMPONENTS.md`** with:
   - Full list of all components
   - Props/modifiers for each
   - HTML structure examples
   - TypeScript integration examples

3. **Add JSDoc comments** to TypeScript files showing CSS class usage:
```typescript
/**
 * Creates an exercise card element
 * @param {Exercise} exercise - Exercise data
 * @returns {HTMLElement} Element with class .exercise-card
 * 
 * CSS Classes Used:
 * - .exercise-card (block)
 * - .exercise-card__header (element)
 * - .exercise-card__title (element)
 * - .exercise-card--compact (modifier, optional)
 */
function createExerciseCard(exercise: Exercise): HTMLElement {
  // ...
}
```

---

## 📊 Progress Tracking

### Overall Completion: ~40%

| Task | Status | Lines Changed | Risk Level | Estimated Hours |
|------|--------|---------------|------------|-----------------|
| Dark Mode Consolidation | ✅ COMPLETE | -261 | Medium | 2 (DONE) |
| Table of Contents | ✅ COMPLETE | +60 | Low | 0.5 (DONE) |
| Section Markers | ✅ COMPLETE | +30 | Low | 1 (DONE) |
| Style Guide HTML | ✅ COMPLETE | +950 | Low | 3 (DONE) |
| Remove Legacy Code | 🚧 TODO | ~-100 | Low | 1 |
| BEM Naming | 🚧 TODO | ~200 | High | 4 |
| Utility Prefixes | 🚧 TODO | ~100 | Medium | 2 |
| Layout Prefixes | 🚧 TODO | ~50 | Low | 1 |
| State Prefixes | 🚧 TODO | ~30 | Low | 0.5 |
| Alphabetical Components | 🚧 TODO | ~1000 | Medium | 3 |
| Media Query Consolidation | 🚧 TODO | ~200 | Medium | 2 |
| CSS Linting Setup | 🚧 TODO | +50 | Low | 1 |
| Component Docs | 🚧 TODO | +500 | Low | 2 |

**Total Estimated Remaining:** ~17 hours

---

## 🎯 Recommended Next Steps

### Immediate (This Week):
1. **Priority 1: Remove Legacy Code** ✨
   - Low risk, high clarity gain
   - Run: `grep -n "Legacy\|remove these" assets/styles.css`
   - Clean up ~763-900 range

2. **Priority 8: Set up CSS Linting** 🔧
   - Will help enforce conventions going forward
   - Low risk, prevents future debt

### Short Term (Next 2 Weeks):
3. **Priority 2: BEM Naming (incremental)** 🏗️
   - Start with one component family (e.g., exercise-card)
   - Add new classes alongside old
   - Migrate TypeScript gradually
   - Remove old classes when safe

4. **Priority 3 & 4: Add Prefixes (utilities & layout)** 🏷️
   - Decide on prefix strategy first
   - Update utilities section
   - Low impact on functionality

### Medium Term (Next Month):
5. **Priority 6: Alphabetize Components** 📚
   - Do incrementally, one component type at a time
   - Commit after each group move

6. **Priority 7: Media Query Strategy** 📱
   - Decide: inline vs. centralized
   - Document decision
   - Refactor consistently

### Long Term (Next Quarter):
7. **Priority 9: Full Component Documentation** 📖
   - Expand style guide
   - Add JSDoc comments
   - Create usage examples

---

## 🛡️ Risk Mitigation

### Before Any Refactoring:
1. ✅ **Backup created** (`assets/styles.css.backup`)
2. ✅ **Git commit** before starting work
3. ✅ **Run validation**: `npm run build && npm test`
4. ✅ **Visual regression test**: Open all pages and check rendering

### During Refactoring:
1. **Change one thing at a time**
2. **Test after each change**
3. **Commit frequently with clear messages**
4. **Keep old classes temporarily** (add new, migrate, then remove old)

### After Refactoring:
1. **Run full validation suite**
2. **Check style-guide.html** renders correctly
3. **Test dark mode** throughout app
4. **Mobile testing** (iOS/Android if possible)
5. **Accessibility audit** with Lighthouse

---

## 📞 Questions & Decisions Needed

### Decision 1: Utility Prefix Strategy
**Question:** Should utilities have `u-` prefix or stay unprefixed?

**Options:**
- **A) Add `u-` prefix** (`.u-mb-4`, `.u-text-center`)
  - ✅ Clear separation from components
  - ✅ Easier to identify in HTML
  - ❌ More verbose
  
- **B) Keep unprefixed** (`.mb-4`, `.text-center`)
  - ✅ Shorter, Tailwind-style
  - ✅ Already familiar to team
  - ❌ Can be confused with component classes

**Recommendation:** Option A (add prefix) for clarity

---

### Decision 2: Media Query Organization
**Question:** Should responsive overrides be inline with components or centralized?

**Options:**
- **A) Inline with components**
  ```css
  .exercise-card { }
  @media (max-width: 640px) {
    .exercise-card { padding: 12px; }
  }
  ```
  - ✅ Easy to see component behavior at all breakpoints
  - ❌ Media queries scattered throughout file
  
- **B) Centralized in Section 8**
  ```css
  /* Section 5: Components */
  .exercise-card { }
  
  /* Section 8: Responsive */
  @media (max-width: 640px) {
    .exercise-card { padding: 12px; }
  }
  ```
  - ✅ All breakpoints in one place
  - ❌ Have to jump around file to understand component

**Recommendation:** Option B (centralized) - already partially done

---

### Decision 3: BEM Modifier Syntax
**Question:** Should modifiers use `--` or single `-`?

**Options:**
- **A) Double dash** (`.exercise-card--compact`)
  - ✅ Official BEM convention
  - ✅ Clear visual distinction
  
- **B) Single dash** (`.exercise-card-compact`)
  - ✅ Shorter
  - ❌ Can be confused with element

**Recommendation:** Option A (double dash) for BEM compliance

---

## 📝 Notes

- **Backward Compatibility:** Keep old class names until all TypeScript/HTML migrated
- **Testing:** Prioritize visual regression testing (compare before/after screenshots)
- **Documentation:** Update `style-guide.html` as changes are made
- **Communication:** Document breaking changes in commit messages

---

## 🔗 Related Files

- Main CSS: `assets/styles.css`
- Style Guide: `style-guide.html`
- TypeScript using CSS: `assets/app.ts`, `assets/form-builder.ts`, `assets/exercise.ts`
- HTML templates: `index.html`, `exercise.html`
- Validation: `scripts/validate_links.py`, `scripts/validate_schemas.py`

---

**Last Review:** October 29, 2025  
**Next Review:** TBD (after completing Priority 1 & 8)
