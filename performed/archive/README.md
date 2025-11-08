# Archived Performance Logs

This directory contains performance logs that have been archived to avoid double-counting.

## Block 5 Week 1 - perf-1 Logs (Archived Nov 8, 2025)

These 3 sessions were originally logged in perf-1 format (flat exercise map) before the perf-2 implementation. They have been successfully migrated to perf-2 format and the migrated versions are now the official records.

### Archived Files

| File | Workout | Date | Status |
|------|---------|------|--------|
| `2025-11-04T133137_5-1_Chest_Triceps_Hypertrophy_perf1.json` | Chest & Triceps Hypertrophy | 2025-11-04 | ✅ Migrated to perf-2 |
| `2025-11-06T133431_5-1_Glutes_Core_Hypertrophy_perf1.json` | Glutes & Core Hypertrophy | 2025-11-06 | ✅ Migrated to perf-2 |
| `2025-11-07T132740_5-1_Back_Biceps_Hypertrophy_perf1.json` | Back & Biceps Hypertrophy | 2025-11-07 | ✅ Migrated to perf-2 |

### Migration Details

- **Migration Date**: November 8, 2025
- **Migration Script**: `scripts/migrate_perf1_to_perf2.py`
- **Migrated Files**: Available in `performed/` with `_perf2.json` suffix
- **Validation**: All migrated files validated against `schemas/performed-v2.schema.json` ✅
- **Report**: See `performed/MIGRATION_REPORT.md` for detailed analysis

### Why Archived?

To prevent double-counting in performance history, only the perf-2 versions are used going forward. The perf-2 format provides:
- Round-by-round fatigue tracking
- Superior AI decision-making for load progression
- Preserved workout structure (supersets, circuits)
- Exercise index for fast queries

### Data Integrity

The archived perf-1 files are preserved for reference but are not included in:
- `performed/index.json` (performance log manifest)
- History page display
- AI analysis of training history
- Progress reports

**Official Records**: Use the `*_perf2.json` versions in the parent directory.
