import type { SectionType, ItemKind } from './workout.types';
export type SetSide = 'L' | 'R' | 'B';
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
export interface SetEntry {
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
    sets?: SetEntry[];
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
    exerciseIndex?: Record<string, ExerciseSummary>;
}
//# sourceMappingURL=performance.types.d.ts.map