import type { LogType } from './workout.types';
export type SetSide = 'L' | 'R' | 'B';
export interface SetEntry {
    set?: number;
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
    logType?: LogType;
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
//# sourceMappingURL=performance.types.d.ts.map