import type { PerformanceLogRecord, WorkoutHistoryRecord, UserSettingsRecord, ExerciseHistoryRecord, QueryOptions, DateRangeQuery, BlockWeekQuery } from '../types/db.types';
declare class ExercAIseDB {
    private db;
    private readonly dbName;
    private readonly version;
    open(): Promise<IDBDatabase>;
    private migrate;
    close(): void;
    addPerformanceLog(log: PerformanceLogRecord): Promise<number>;
    getPerformanceLog(id: number): Promise<PerformanceLogRecord | undefined>;
    getAllPerformanceLogs(options?: QueryOptions): Promise<PerformanceLogRecord[]>;
    getPerformanceLogsByWorkout(workoutFile: string, options?: QueryOptions): Promise<PerformanceLogRecord[]>;
    getPerformanceLogsByDateRange(query: DateRangeQuery): Promise<PerformanceLogRecord[]>;
    getPerformanceLogsByBlock(query: BlockWeekQuery): Promise<PerformanceLogRecord[]>;
    updatePerformanceLog(id: number, updates: Partial<PerformanceLogRecord>): Promise<void>;
    deletePerformanceLog(id: number): Promise<void>;
    addOrUpdateWorkoutHistory(workout: WorkoutHistoryRecord): Promise<number>;
    getWorkoutHistoryByFile(workoutFile: string): Promise<WorkoutHistoryRecord | undefined>;
    getAllWorkoutHistory(options?: QueryOptions): Promise<WorkoutHistoryRecord[]>;
    getSetting<K extends string>(key: K): Promise<UserSettingsRecord | undefined>;
    setSetting(key: string, value: any): Promise<void>;
    deleteSetting(key: string): Promise<void>;
    addOrUpdateExerciseHistory(exercise: ExerciseHistoryRecord): Promise<number>;
    getExerciseHistoryByKey(exerciseKey: string): Promise<ExerciseHistoryRecord | undefined>;
    getAllExerciseHistory(options?: QueryOptions): Promise<ExerciseHistoryRecord[]>;
    clearAllData(): Promise<void>;
    exportAllData(): Promise<{
        performanceLogs: PerformanceLogRecord[];
        workoutHistory: WorkoutHistoryRecord[];
        userSettings: UserSettingsRecord[];
        exerciseHistory: ExerciseHistoryRecord[];
    }>;
    private getAllSettings;
}
export declare const db: ExercAIseDB;
export {};
//# sourceMappingURL=db.d.ts.map