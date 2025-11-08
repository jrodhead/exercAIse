/**
 * Type definitions for performance log data structures
 * Based on schemas/performed.schema.json (perf-1) and schemas/performed-v2.schema.json (perf-2)
 */

import type { LogType, SectionType, ItemKind } from './workout.types';

export type SetSide = 'L' | 'R' | 'B';

// ============================================================================
// perf-1: Legacy flat format (for migration reference)
// ============================================================================

export interface SetEntry {
  set?: number; // Set number (1-based index)
  weight?: number | string;
  reps?: number;
  rpe?: number;
  timeSeconds?: number;
  holdSeconds?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  side?: SetSide;
  tempo?: string;
  restSeconds?: number;
  multiplier?: number;
  completed?: boolean;
  notes?: string;
}

export interface PerformedExercise {
  name?: string;
  logType?: LogType; // Required for perf-1 format
  notes?: string;
  sets: SetEntry[];
}

export interface PerformanceLogV1 {
  version?: string; // "perf-1" or "1"
  workoutFile: string;
  timestamp: string;
  date?: string;
  block?: number;
  week?: number;
  title?: string;
  notes?: string;
  device?: Record<string, unknown>;
  exercises: Record<string, PerformedExercise>;
}

// Legacy alias for backward compatibility
export type PerformanceLog = PerformanceLogV1;

// ============================================================================
// perf-2: Nested structure format (mirrors session organization)
// ============================================================================

/**
 * Performance data for one exercise in one round/set
 */
export interface ExercisePerformance {
  key: string; // Exercise slug for linking to exercises/*.json
  name: string; // Display name
  weight?: number;
  multiplier?: number;
  reps?: number;
  rpe?: number;
  timeSeconds?: number;
  holdSeconds?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  side?: SetSide;
  tempo?: string;
  completed?: boolean;
  notes?: string;
}

/**
 * One set of a standalone exercise
 */
export interface SetEntryV2 {
  set: number; // Required in perf-2
  weight?: number;
  multiplier?: number;
  reps?: number;
  rpe?: number;
  timeSeconds?: number;
  holdSeconds?: number;
  distanceMeters?: number;
  distanceMiles?: number;
  side?: SetSide;
  tempo?: string;
  restSeconds?: number;
  completed?: boolean;
  notes?: string;
}

/**
 * One complete round through a superset or circuit
 */
export interface Round {
  round: number; // Round number (1, 2, 3, ...)
  prescribedRestSeconds?: number;
  actualRestSeconds?: number; // Optional user input
  notes?: string;
  exercises: ExercisePerformance[]; // Must have at least one exercise
}

/**
 * Workout item for performance logs: exercise, superset, or circuit
 * Similar to workout.types.Item but for performance tracking
 */
export interface PerformanceItem {
  kind: ItemKind;
  name: string;
  notes?: string;
  
  // For standalone exercises
  sets?: SetEntryV2[];
  
  // For supersets and circuits
  rounds?: Round[];
}

/**
 * Workout section for performance logs
 * Similar to workout.types.Section but for performance tracking
 */
export interface PerformanceSection {
  type: SectionType;
  title: string;
  notes?: string;
  items: PerformanceItem[];
}

/**
 * Pre-computed summary for fast queries (optional)
 */
export interface ExerciseSummary {
  name: string;
  sectionPath: string; // JSONPath to location in sections tree
  totalSets: number; // For standalone exercises
  totalRounds: number; // For supersets/circuits
  avgRPE: number;
  totalVolume: number; // Sum of (weight * multiplier * reps)
}

/**
 * perf-2: Nested structure performance log
 * Mirrors session organization for superior fatigue analysis
 */
export interface PerformanceLogV2 {
  version: 'perf-2';
  workoutFile: string;
  timestamp: string;
  date?: string;
  block?: number;
  week?: number;
  title?: string;
  notes?: string;
  device?: Record<string, unknown>;
  sections: PerformanceSection[];
  exerciseIndex?: Record<string, ExerciseSummary>; // Optional flat index
}
