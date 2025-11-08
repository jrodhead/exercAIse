# perf-1 → perf-2 Migration Report

**Date**: November 8, 2025  
**Script**: `scripts/migrate_perf1_to_perf2.py`  
**Status**: ✅ Complete

## Summary

Successfully migrated 3 Block 5 Week 1 performance logs from flat (perf-1) to nested (perf-2) format.

## Migrated Files

| Original File | Migrated File | Sections | Exercises | Items | Status |
|--------------|--------------|----------|-----------|-------|--------|
| `2025-11-04T133137_5-1_Chest_Triceps_Hypertrophy_perf1.json` | `*_perf2.json` | 4 | 7 | 4 | ✅ |
| `2025-11-06T133431_5-1_Glutes_Core_Hypertrophy_perf1.json` | `*_perf2.json` | 3 | 6 | 3 | ✅ |
| `2025-11-07T132740_5-1_Back_Biceps_Hypertrophy_perf1.json` | `*_perf2.json` | 4 | 7 | 4 | ✅ |

## Validation

- ✅ All 3 files validated against `schemas/performed-v2.schema.json`
- ✅ Round-by-round data preserved correctly
- ✅ ExerciseIndex calculations verified (volume, avg RPE, JSONPath)
- ✅ Original perf-1 files preserved

## Example: Superset A Fatigue Analysis

**Workout**: Chest & Triceps Hypertrophy (2025-11-04)

### Round-by-Round Performance

| Round | Flat Bench Press | Close-Grip Press |
|-------|-----------------|------------------|
| 1 | 40×2 × 10 @ RPE 7 | 30×2 × 10 @ RPE 7 |
| 2 | 40×2 × 10 @ RPE 8 | 30×2 × 10 @ RPE 8 |
| 3 | 40×2 × 6 @ RPE 7 | 30×2 × 6 @ RPE 7 |

### Fatigue Pattern Analysis

- **Rep Pattern**: 10 → 10 → 6 (both exercises)
- **RPE Pattern**: 7 → 8 → 7 (climbed then dipped as reps dropped)
- **Diagnosis**: CUMULATIVE FATIGUE from superset pairing
  - NOT exercise too heavy (round 1 @ RPE 7 is manageable)
  - Triceps used in BOTH exercises (compound fatigue)
  - Rep drop in round 3 is expected cumulative fatigue

### AI Decision for Next Session

- **Option 1**: PROGRESS load (both exercises handled well, 2 rounds @ RPE 7-8)
- **Option 2**: Add 15-30s rest if RPE 8→9 trend continues in Week 2
- **Option 3**: Separate exercises if fatigue cascade too severe

## Exercise Index Sample

```json
{
  "flat-dumbbell-bench-press": {
    "name": "Flat Dumbbell Bench Press",
    "sectionPath": "sections[0].items[0].rounds[*].exercises[0]",
    "totalSets": 3,
    "totalRounds": 3,
    "avgRPE": 7.3,
    "totalVolume": 2080
  }
}
```

## Benefits of perf-2 Format

1. **Fatigue Analysis**: Round-by-round tracking reveals cumulative fatigue patterns
2. **AI Decisions**: Distinguish "exercise too heavy" vs "fatigue cascade from pairing"
3. **Progressive Overload**: Track RPE progression across rounds to inform load increases
4. **Structure Preservation**: Knows which exercises are supersetted for better prescription
5. **Fast Queries**: ExerciseIndex enables instant lookups without tree traversal

## Reusability

Migration script can be run on any perf-1 logs:

```bash
# Migrate specific files
python3 scripts/migrate_perf1_to_perf2.py performed/2025-*_perf1.json

# Migrate all Block 4 logs
python3 scripts/migrate_perf1_to_perf2.py performed/*4-*_perf1.json

# Migrate all perf-1 logs
python3 scripts/migrate_perf1_to_perf2.py performed/*_perf1.json
```

## Archival

To prevent double-counting in performance history:
- ✅ Original perf-1 files moved to `performed/archive/`
- ✅ Only perf-2 files remain in `performed/` for active use
- ✅ Performance index rebuilt (51 → 49 entries)
- ✅ Archive documented in `performed/archive/README.md`

## Next Steps

- ✅ Migration complete
- ✅ Validation passed
- ✅ Files archived (no double-counting)
- ⏳ Deploy to production
- ⏳ Test with Block 5 Week 2 workouts (first native perf-2 logs)
- ⏳ Monitor AI load prescription improvements with round-level data

---

**Original perf-1 files**: Archived in `performed/archive/` (preserved for reference)  
**Active perf-2 files**: Available in `performed/` with `_perf2.json` suffix  
**Schema**: `schemas/performed-v2.schema.json`
