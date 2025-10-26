/**
 * IndexedDB Schema Types
 * Type-safe database schema for workout history, performance logs, and user data
 */

import type { PerformanceLog } from './performance.types';

// ============================================================================
// Database Configuration
// ============================================================================

export const DB_NAME = 'exercAIse';
export const DB_VERSION = 1;

// ============================================================================
// Object Store Names
// ============================================================================

export enum ObjectStore {
  PerformanceLogs = 'performanceLogs',
  WorkoutHistory = 'workoutHistory',
  UserSettings = 'userSettings',
  ExerciseHistory = 'exerciseHistory'
}

// ============================================================================
// Performance Logs Store
// ============================================================================

export interface PerformanceLogRecord extends PerformanceLog {
  id?: number; // Auto-incremented primary key
  syncedToGit?: boolean; // Track if exported to performed/
  deviceId?: string; // Device identifier for multi-device sync
}

export interface PerformanceLogIndexes {
  byTimestamp: string; // Index on timestamp
  byWorkoutFile: string; // Index on workoutFile
  byDate: string; // Index on date (YYYY-MM-DD)
  byBlockWeek: [number, number]; // Compound index on [block, week]
}

// ============================================================================
// Workout History Store
// ============================================================================

export interface WorkoutHistoryRecord {
  id?: number;
  workoutFile: string; // Primary identifier
  title: string;
  lastPerformed?: string; // ISO timestamp
  timesPerformed: number;
  averageRPE?: number;
  metadata?: {
    block?: number;
    week?: number;
    tags?: string[];
    type?: 'strength' | 'endurance' | 'mobility' | 'recovery';
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutHistoryIndexes {
  byWorkoutFile: string; // Unique index
  byLastPerformed: string;
  byTimesPerformed: number;
}

// ============================================================================
// User Settings Store
// ============================================================================

export interface UserSettingsRecord {
  key: string; // Primary key (e.g., 'preferences', 'equipment', 'injuries')
  value: any; // JSON-serializable value
  updatedAt: string;
}

export type UserPreferences = {
  key: 'preferences';
  value: {
    defaultRPETarget?: number;
    restTimerEnabled?: boolean;
    soundEnabled?: boolean;
    darkMode?: boolean;
    units?: 'metric' | 'imperial';
  };
};

export type UserEquipment = {
  key: 'equipment';
  value: {
    dumbbells?: number[]; // Available weights in lb or kg
    barbell?: boolean;
    bands?: boolean;
    kettlebells?: number[];
    pullupBar?: boolean;
    bench?: boolean;
  };
};

export type UserInjuries = {
  key: 'injuries';
  value: {
    current?: Array<{
      joint: string;
      severity: 'minor' | 'moderate' | 'major';
      since: string; // ISO date
      notes?: string;
    }>;
    history?: Array<{
      joint: string;
      recoveredAt: string;
    }>;
  };
};

// ============================================================================
// Exercise History Store
// ============================================================================

export interface ExerciseHistoryRecord {
  id?: number;
  exerciseKey: string; // Slugified exercise name
  exerciseName: string;
  logType: 'strength' | 'endurance' | 'carry' | 'mobility' | 'stretch';
  lastPerformed?: string; // ISO timestamp
  timesPerformed: number;
  bestPerformance?: {
    weight?: number;
    reps?: number;
    rpe?: number;
    timeSeconds?: number;
    distanceMiles?: number;
    performedAt: string;
  };
  recentHistory?: Array<{
    performedAt: string;
    sets: number;
    avgWeight?: number;
    avgReps?: number;
    avgRPE?: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseHistoryIndexes {
  byExerciseKey: string; // Unique index
  byLastPerformed: string;
  byTimesPerformed: number;
  byLogType: string;
}

// ============================================================================
// Database Schema Configuration
// ============================================================================

export interface DBSchema {
  [ObjectStore.PerformanceLogs]: {
    key: number;
    value: PerformanceLogRecord;
    indexes: {
      timestamp: string;
      workoutFile: string;
      date: string;
      blockWeek: [number, number];
    };
  };
  [ObjectStore.WorkoutHistory]: {
    key: number;
    value: WorkoutHistoryRecord;
    indexes: {
      workoutFile: string;
      lastPerformed: string;
      timesPerformed: number;
    };
  };
  [ObjectStore.UserSettings]: {
    key: string;
    value: UserSettingsRecord;
  };
  [ObjectStore.ExerciseHistory]: {
    key: number;
    value: ExerciseHistoryRecord;
    indexes: {
      exerciseKey: string;
      lastPerformed: string;
      timesPerformed: number;
      logType: string;
    };
  };
}

// ============================================================================
// Migration Types
// ============================================================================

export interface MigrationContext {
  db: IDBDatabase;
  transaction: IDBTransaction;
  oldVersion: number;
  newVersion: number | null;
}

export type MigrationFunction = (context: MigrationContext) => void | Promise<void>;

// ============================================================================
// Query Types
// ============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: 'asc' | 'desc';
}

export interface DateRangeQuery {
  start: string; // ISO date
  end: string; // ISO date
}

export interface BlockWeekQuery {
  block: number;
  week?: number;
}
