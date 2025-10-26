/**
 * Unit tests for IndexedDB storage layer
 * Tests database operations, migrations, and storage adapter
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../../lib/db';
import type { PerformanceLogRecord, WorkoutHistoryRecord, ExerciseHistoryRecord } from '../../types/db.types';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

describe('IndexedDB - Database Operations', () => {
  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.clearAllData();
    db.close();
  });

  describe('Performance Logs', () => {
    it('should add a performance log', async () => {
      const log: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        date: '2025-10-26',
        exercises: {
          'goblet_squat': {
            name: 'Goblet Squat',
            logType: 'strength',
            sets: [
              { set: 1, weight: 35, multiplier: 2, reps: 10, rpe: 7 }
            ]
          }
        }
      };

      const id = await db.addPerformanceLog(log);
      expect(id).toBeGreaterThan(0);

      const retrieved = await db.getPerformanceLog(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.workoutFile).toBe('workouts/test.json');
      expect(retrieved?.exercises.goblet_squat).toBeDefined();
    });

    it('should retrieve all performance logs', async () => {
      const log1: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      };

      const log2: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/lower.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      };

      await db.addPerformanceLog(log1);
      await db.addPerformanceLog(log2);

      const all = await db.getAllPerformanceLogs();
      expect(all.length).toBe(2);
    });

    it('should query logs by workout file', async () => {
      const log1: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      };

      const log2: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      };

      const log3: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/lower.json',
        timestamp: '2025-10-28T12:00:00Z',
        exercises: {}
      };

      await db.addPerformanceLog(log1);
      await db.addPerformanceLog(log2);
      await db.addPerformanceLog(log3);

      const upperLogs = await db.getPerformanceLogsByWorkout('workouts/upper.json');
      expect(upperLogs.length).toBe(2);
      expect(upperLogs.every(log => log.workoutFile === 'workouts/upper.json')).toBe(true);
    });

    it('should apply query options (limit, offset)', async () => {
      for (let i = 0; i < 10; i++) {
        const log: PerformanceLogRecord = {
          version: 'perf-1',
          workoutFile: `workouts/test${i}.json`,
          timestamp: `2025-10-${20 + i}T12:00:00Z`,
          exercises: {}
        };
        await db.addPerformanceLog(log);
      }

      const limited = await db.getAllPerformanceLogs({ limit: 5 });
      expect(limited.length).toBe(5);

      const offset = await db.getAllPerformanceLogs({ limit: 5, offset: 5 });
      expect(offset.length).toBe(5);
    });

    it('should update a performance log', async () => {
      const log: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {},
        syncedToGit: false
      };

      const id = await db.addPerformanceLog(log);
      
      await db.updatePerformanceLog(id, { syncedToGit: true });

      const updated = await db.getPerformanceLog(id);
      expect(updated?.syncedToGit).toBe(true);
    });

    it('should delete a performance log', async () => {
      const log: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      };

      const id = await db.addPerformanceLog(log);
      await db.deletePerformanceLog(id);

      const retrieved = await db.getPerformanceLog(id);
      expect(retrieved).toBeUndefined();
    });

    it('should query by date range', async () => {
      const log1: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test1.json',
        timestamp: '2025-10-20T12:00:00Z',
        date: '2025-10-20',
        exercises: {}
      };

      const log2: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test2.json',
        timestamp: '2025-10-25T12:00:00Z',
        date: '2025-10-25',
        exercises: {}
      };

      const log3: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test3.json',
        timestamp: '2025-10-30T12:00:00Z',
        date: '2025-10-30',
        exercises: {}
      };

      await db.addPerformanceLog(log1);
      await db.addPerformanceLog(log2);
      await db.addPerformanceLog(log3);

      const ranged = await db.getPerformanceLogsByDateRange({
        start: '2025-10-22',
        end: '2025-10-28'
      });

      expect(ranged.length).toBe(1);
      expect(ranged[0].date).toBe('2025-10-25');
    });

    it('should query by block and week', async () => {
      const log1: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test1.json',
        timestamp: '2025-10-26T12:00:00Z',
        block: 3,
        week: 2,
        exercises: {}
      };

      const log2: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test2.json',
        timestamp: '2025-10-27T12:00:00Z',
        block: 3,
        week: 3,
        exercises: {}
      };

      const log3: PerformanceLogRecord = {
        version: 'perf-1',
        workoutFile: 'workouts/test3.json',
        timestamp: '2025-10-28T12:00:00Z',
        block: 4,
        week: 1,
        exercises: {}
      };

      await db.addPerformanceLog(log1);
      await db.addPerformanceLog(log2);
      await db.addPerformanceLog(log3);

      // Query specific block/week
      const specific = await db.getPerformanceLogsByBlock({ block: 3, week: 2 });
      expect(specific.length).toBe(1);
      expect(specific[0].week).toBe(2);

      // Query all weeks in block
      const allBlock = await db.getPerformanceLogsByBlock({ block: 3 });
      expect(allBlock.length).toBe(2);
    });
  });

  describe('Workout History', () => {
    it('should add workout history', async () => {
      const workout: WorkoutHistoryRecord = {
        workoutFile: 'workouts/upper.json',
        title: 'Upper Body Strength',
        timesPerformed: 1,
        lastPerformed: '2025-10-26T12:00:00Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const id = await db.addOrUpdateWorkoutHistory(workout);
      expect(id).toBeGreaterThan(0);

      const retrieved = await db.getWorkoutHistoryByFile('workouts/upper.json');
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Upper Body Strength');
    });

    it('should update existing workout history', async () => {
      const workout: WorkoutHistoryRecord = {
        workoutFile: 'workouts/upper.json',
        title: 'Upper Body Strength',
        timesPerformed: 1,
        lastPerformed: '2025-10-26T12:00:00Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addOrUpdateWorkoutHistory(workout);

      // Update with more performances
      const updated: WorkoutHistoryRecord = {
        workoutFile: 'workouts/upper.json',
        title: 'Upper Body Strength',
        timesPerformed: 3,
        lastPerformed: '2025-10-28T12:00:00Z',
        createdAt: workout.createdAt,
        updatedAt: new Date().toISOString()
      };

      await db.addOrUpdateWorkoutHistory(updated);

      const retrieved = await db.getWorkoutHistoryByFile('workouts/upper.json');
      expect(retrieved?.timesPerformed).toBe(3);
    });

    it('should retrieve all workout history', async () => {
      const workout1: WorkoutHistoryRecord = {
        workoutFile: 'workouts/upper.json',
        title: 'Upper',
        timesPerformed: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const workout2: WorkoutHistoryRecord = {
        workoutFile: 'workouts/lower.json',
        title: 'Lower',
        timesPerformed: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addOrUpdateWorkoutHistory(workout1);
      await db.addOrUpdateWorkoutHistory(workout2);

      const all = await db.getAllWorkoutHistory();
      expect(all.length).toBe(2);
    });
  });

  describe('User Settings', () => {
    it('should save and retrieve settings', async () => {
      const preferences = {
        defaultRPETarget: 7.5,
        soundEnabled: true,
        darkMode: false
      };

      await db.setSetting('preferences', preferences);

      const retrieved = await db.getSetting('preferences');
      expect(retrieved).toBeDefined();
      expect(retrieved?.value.defaultRPETarget).toBe(7.5);
      expect(retrieved?.value.soundEnabled).toBe(true);
    });

    it('should update existing settings', async () => {
      await db.setSetting('dark_mode', false);
      await db.setSetting('dark_mode', true);

      const retrieved = await db.getSetting('dark_mode');
      expect(retrieved?.value).toBe(true);
    });

    it('should delete settings', async () => {
      await db.setSetting('temp_setting', 'value');
      await db.deleteSetting('temp_setting');

      const retrieved = await db.getSetting('temp_setting');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Exercise History', () => {
    it('should add exercise history', async () => {
      const exercise: ExerciseHistoryRecord = {
        exerciseKey: 'goblet_squat',
        exerciseName: 'Goblet Squat',
        logType: 'strength',
        timesPerformed: 10,
        lastPerformed: '2025-10-26T12:00:00Z',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const id = await db.addOrUpdateExerciseHistory(exercise);
      expect(id).toBeGreaterThan(0);

      const retrieved = await db.getExerciseHistoryByKey('goblet_squat');
      expect(retrieved).toBeDefined();
      expect(retrieved?.exerciseName).toBe('Goblet Squat');
    });

    it('should update existing exercise history', async () => {
      const exercise: ExerciseHistoryRecord = {
        exerciseKey: 'goblet_squat',
        exerciseName: 'Goblet Squat',
        logType: 'strength',
        timesPerformed: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.addOrUpdateExerciseHistory(exercise);

      const updated: ExerciseHistoryRecord = {
        exerciseKey: 'goblet_squat',
        exerciseName: 'Goblet Squat',
        logType: 'strength',
        timesPerformed: 15,
        lastPerformed: '2025-10-28T12:00:00Z',
        bestPerformance: {
          weight: 50,
          reps: 12,
          rpe: 8,
          performedAt: '2025-10-28T12:00:00Z'
        },
        createdAt: exercise.createdAt,
        updatedAt: new Date().toISOString()
      };

      await db.addOrUpdateExerciseHistory(updated);

      const retrieved = await db.getExerciseHistoryByKey('goblet_squat');
      expect(retrieved?.timesPerformed).toBe(15);
      expect(retrieved?.bestPerformance?.weight).toBe(50);
    });
  });

  describe('Utility Operations', () => {
    it('should clear all data', async () => {
      // Add some data
      await db.addPerformanceLog({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      });

      await db.setSetting('test', 'value');

      // Clear
      await db.clearAllData();

      // Verify empty
      const logs = await db.getAllPerformanceLogs();
      const setting = await db.getSetting('test');

      expect(logs.length).toBe(0);
      expect(setting).toBeUndefined();
    });

    it('should export all data', async () => {
      await db.addPerformanceLog({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      });

      await db.setSetting('test', 'value');

      const exported = await db.exportAllData();

      expect(exported.performanceLogs.length).toBe(1);
      expect(exported.userSettings.length).toBe(1);
      expect(exported.workoutHistory).toBeDefined();
      expect(exported.exerciseHistory).toBeDefined();
    });
  });
});
