/**
 * Type definitions for performance log data structures
 * Based on schemas/performance.schema.json (nested structure format)
 */

import type { SectionType, ItemKind } from './workout.types';

export type SetSide = 'L' | 'R' | 'B';

// ============================================================================
// Nested structure format (mirrors session organization)
// ============================================================================

/**
 * Performance data for one exercise in one round/set
 */
export interface ExercisePerformance {
  key: string; // Exercise slug for linking to exercises/*.json
  name: string; // Display name
  weight?: number;
  angle?: number;
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
export interface SetEntry {
  set: number; // Required in nested format
  weight?: number;
  angle?: number;
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
  sets?: SetEntry[];
  
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
  angle?: number;
  name: string;
  sectionPath: string; // JSONPath to location in sections tree
  totalSets: number; // For standalone exercises
  totalRounds: number; // For supersets/circuits
  avgRPE: number;
  totalVolume: number; // Sum of (weight * multiplier * reps)
}

/**
 * Nested structure performance log
 * Mirrors session organization for superior fatigue analysis
 */
export interface PerformanceLog {
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
