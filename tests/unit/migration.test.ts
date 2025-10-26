/**
 * Unit tests for localStorage → IndexedDB migration
 * Tests migration execution and rollback
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  migrateLocalStorageToIndexedDB,
  rollbackMigration,
  getMigrationStatus,
  autoMigrate
} from '../../lib/migration';
import { db } from '../../lib/db';
import type { PerformanceLog } from '../../types';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('Migration - localStorage to IndexedDB', () => {
  afterEach(async () => {
    // Clean up after each test
    localStorage.clear();
    try {
      await db.open();
      await db.clearAllData();
      db.close();
    } catch (e) {
      // DB might not be open, that's fine
    }
  });

  describe('Migration Execution', () => {
    it('should migrate performance logs to IndexedDB', async () => {
      // SETUP: Clear everything first
      localStorage.clear();
      
      // SETUP: Add test data to localStorage BEFORE migration
      const log: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {
          'squat': {
            name: 'Squat',
            logType: 'strength',
            sets: [
              { set: 1, weight: 135, reps: 8, rpe: 8 }
            ]
          }
        }
      };

      localStorage.setItem('perf_test', JSON.stringify(log));

      // ACT: Run migration
      const result = await migrateLocalStorageToIndexedDB();

      // ASSERT: Migration completed successfully
      expect(result.completed).toBe(true);
      expect(result.performanceLogsMigrated).toBe(1);
      expect(result.errors.length).toBe(0);

      // ASSERT: Data was migrated to IndexedDB
      const dbLogs = await db.getAllPerformanceLogs();
      expect(dbLogs.length).toBe(1);
      expect(dbLogs[0].workoutFile).toBe('workouts/test.json');
      expect(dbLogs[0].exercises.squat).toBeDefined();
    });

    it('should migrate settings to IndexedDB', async () => {
      localStorage.setItem('dark_mode', 'true');
      localStorage.setItem('sound_enabled', 'false');

      const result = await migrateLocalStorageToIndexedDB();

      expect(result.completed).toBe(true);
      expect(result.settingsMigrated).toBeGreaterThanOrEqual(2);

      const darkMode = await db.getSetting('dark_mode');
      expect(darkMode?.value).toBe(true);

      const soundEnabled = await db.getSetting('sound_enabled');
      expect(soundEnabled?.value).toBe(false);
    });

    it('should track migration status', async () => {
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      await migrateLocalStorageToIndexedDB();

      const status = getMigrationStatus();

      expect(status).not.toBeNull();
      expect(status?.completed).toBe(true);
      expect(status?.completedAt).toBeDefined();
      expect(status?.performanceLogsMigrated).toBe(1);
    });

    it('should skip migration if already completed', async () => {
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      // First migration
      const result1 = await migrateLocalStorageToIndexedDB();
      expect(result1.completed).toBe(true);
      expect(result1.performanceLogsMigrated).toBeGreaterThan(0);

      // Add another log after migration
      localStorage.setItem('perf_1', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test2.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      }));

      // Second migration should return existing status without re-migrating
      const result2 = await migrateLocalStorageToIndexedDB();
      expect(result2.completed).toBe(true);
      expect(result2.completedAt).toBe(result1.completedAt); // Same timestamp

      // Should still have only the first log (second wasn't migrated)
      const logs = await db.getAllPerformanceLogs();
      expect(logs.length).toBe(1);
    });

    it('should migrate multiple performance logs', async () => {
      const log1: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {
          'bench_press': {
            name: 'Bench Press',
            logType: 'strength',
            sets: [
              { set: 1, weight: 45, multiplier: 2, reps: 10, rpe: 7 }
            ]
          }
        }
      };

      const log2: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {
          'bench_press': {
            name: 'Bench Press',
            logType: 'strength',
            sets: [
              { set: 1, weight: 50, multiplier: 2, reps: 8, rpe: 8 }
            ]
          }
        }
      };

      localStorage.setItem('perf_0', JSON.stringify(log1));
      localStorage.setItem('perf_1', JSON.stringify(log2));

      const result = await migrateLocalStorageToIndexedDB();

      expect(result.completed).toBe(true);
      expect(result.performanceLogsMigrated).toBe(2);
      
      const logs = await db.getAllPerformanceLogs();
      expect(logs.length).toBe(2);
    });
  });

  describe('Rollback', () => {
    it('should clear IndexedDB and reset migration status', async () => {
      // Set up localStorage
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));
      localStorage.setItem('dark_mode', 'true');

      // Migrate
      await migrateLocalStorageToIndexedDB();
      
      let status = getMigrationStatus();
      expect(status?.completed).toBe(true);

      // Rollback
      await rollbackMigration();

      // Verify IndexedDB cleared
      const logs = await db.getAllPerformanceLogs();
      expect(logs.length).toBe(0);

      // Verify migration status reset
      status = getMigrationStatus();
      expect(status).toBeNull();
    });
  });

  describe('Auto-Migration', () => {
    it('should auto-migrate on first run', async () => {
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      // Simulate app startup
      await autoMigrate();

      const logs = await db.getAllPerformanceLogs();
      expect(logs.length).toBe(1);

      const status = getMigrationStatus();
      expect(status?.completed).toBe(true);
    });

    it('should skip auto-migration if already done', async () => {
      // First migration
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      await autoMigrate();

      // Add another log
      localStorage.setItem('perf_1', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test2.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      }));

      // Second auto-migration should skip
      await autoMigrate();

      // Should still have only 1 log
      const logs = await db.getAllPerformanceLogs();
      expect(logs.length).toBe(1);
    });
  });
});
