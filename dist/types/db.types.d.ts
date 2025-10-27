import type { PerformanceLog } from './performance.types';
export declare const DB_NAME = "exercAIse";
export declare const DB_VERSION = 1;
export declare enum ObjectStore {
    PerformanceLogs = "performanceLogs",
    WorkoutHistory = "workoutHistory",
    UserSettings = "userSettings",
    ExerciseHistory = "exerciseHistory"
}
export interface PerformanceLogRecord extends PerformanceLog {
    id?: number;
    syncedToGit?: boolean;
    deviceId?: string;
}
export interface PerformanceLogIndexes {
    byTimestamp: string;
    byWorkoutFile: string;
    byDate: string;
    byBlockWeek: [number, number];
}
export interface WorkoutHistoryRecord {
    id?: number;
    workoutFile: string;
    title: string;
    lastPerformed?: string;
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
    byWorkoutFile: string;
    byLastPerformed: string;
    byTimesPerformed: number;
}
export interface UserSettingsRecord {
    key: string;
    value: any;
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
        dumbbells?: number[];
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
            since: string;
            notes?: string;
        }>;
        history?: Array<{
            joint: string;
            recoveredAt: string;
        }>;
    };
};
export interface ExerciseHistoryRecord {
    id?: number;
    exerciseKey: string;
    exerciseName: string;
    logType: 'strength' | 'endurance' | 'carry' | 'mobility' | 'stretch';
    lastPerformed?: string;
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
    byExerciseKey: string;
    byLastPerformed: string;
    byTimesPerformed: number;
    byLogType: string;
}
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
export interface MigrationContext {
    db: IDBDatabase;
    transaction: IDBTransaction;
    oldVersion: number;
    newVersion: number | null;
}
export type MigrationFunction = (context: MigrationContext) => void | Promise<void>;
export interface QueryOptions {
    limit?: number;
    offset?: number;
    orderBy?: 'asc' | 'desc';
}
export interface DateRangeQuery {
    start: string;
    end: string;
}
export interface BlockWeekQuery {
    block: number;
    week?: number;
}
//# sourceMappingURL=db.types.d.ts.map