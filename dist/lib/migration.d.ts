interface MigrationStatus {
    version: number;
    completed: boolean;
    completedAt?: string;
    performanceLogsMigrated: number;
    settingsMigrated: number;
    errors: string[];
}
export declare function getMigrationStatus(): MigrationStatus | null;
export declare function migrateLocalStorageToIndexedDB(): Promise<MigrationStatus>;
export declare function rollbackMigration(): Promise<void>;
export declare function exportToLocalStorage(): Promise<void>;
export declare function autoMigrate(): Promise<void>;
export {};
//# sourceMappingURL=migration.d.ts.map