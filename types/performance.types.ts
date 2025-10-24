/**
 * Type definitions for performance log data structures
 * Based on schemas/performed.schema.json
 */

export type SetSide = 'L' | 'R' | 'B';

export interface SetEntry {
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
  notes?: string;
  sets: SetEntry[];
}

export interface PerformanceLog {
  version?: string;
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
