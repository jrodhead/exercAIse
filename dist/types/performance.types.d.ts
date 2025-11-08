import type { LogType, SectionType, ItemKind } from './workout.types';
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
export interface PerformanceLogV1 {
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
export type PerformanceLog = PerformanceLogV1;
export interface ExercisePerformance {
    key: string;
    name: string;
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
export interface SetEntryV2 {
    set: number;
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
export interface Round {
    round: number;
    prescribedRestSeconds?: number;
    actualRestSeconds?: number;
    notes?: string;
    exercises: ExercisePerformance[];
}
export interface PerformanceItem {
    kind: ItemKind;
    name: string;
    notes?: string;
    sets?: SetEntryV2[];
    rounds?: Round[];
}
export interface PerformanceSection {
    type: SectionType;
    title: string;
    notes?: string;
    items: PerformanceItem[];
}
export interface ExerciseSummary {
    name: string;
    sectionPath: string;
    totalSets: number;
    totalRounds: number;
    avgRPE: number;
    totalVolume: number;
}
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
    exerciseIndex?: Record<string, ExerciseSummary>;
}
//# sourceMappingURL=performance.types.d.ts.map