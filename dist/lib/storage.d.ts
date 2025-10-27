import type { PerformanceLog } from '../types/performance.types';
import type { QueryOptions } from '../types/db.types';
type StorageBackend = 'indexeddb' | 'localstorage';
export declare class StorageAdapter {
    private backend;
    private migrationAttempted;
    init(): Promise<void>;
    getBackend(): StorageBackend;
    _resetForTesting(): void;
    savePerformanceLog(log: PerformanceLog): Promise<void>;
    getPerformanceLogs(workoutFile: string, options?: QueryOptions): Promise<PerformanceLog[]>;
    getAllPerformanceLogs(options?: QueryOptions): Promise<PerformanceLog[]>;
    getRecentPerformanceLogs(limit?: number): Promise<PerformanceLog[]>;
    getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined>;
    setSetting(key: string, value: any): Promise<void>;
    private saveToLocalStorage;
    private getFromLocalStorage;
    private getAllFromLocalStorage;
    private getSettingFromLocalStorage;
    private setSettingToLocalStorage;
    clearAll(): Promise<void>;
    exportAll(): Promise<any>;
}
export declare const storage: StorageAdapter;
export {};
//# sourceMappingURL=storage.d.ts.map