import { db } from './db.js';
const MIGRATION_KEY = 'indexeddb_migration_status';
function extractPerformanceLogsFromLocalStorage() {
    const logs = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key)
            continue;
        if (key.startsWith('workout_performed_') || key.startsWith('perf_')) {
            try {
                const value = localStorage.getItem(key);
                if (!value)
                    continue;
                const data = JSON.parse(value);
                if (data && typeof data === 'object' && (data.exercises || data.workoutFile)) {
                    logs.push(data);
                }
            }
            catch (e) {
                console.warn(`Failed to parse localStorage key ${key}:`, e);
            }
        }
    }
    return logs;
}
function extractSettingsFromLocalStorage() {
    const settings = {};
    const settingsKeys = [
        'user_preferences',
        'user_equipment',
        'user_injuries',
        'dark_mode',
        'default_rpe',
        'sound_enabled',
        'rest_timer_enabled'
    ];
    for (const key of settingsKeys) {
        const value = localStorage.getItem(key);
        if (value) {
            try {
                settings[key] = JSON.parse(value);
            }
            catch (e) {
                settings[key] = value;
            }
        }
    }
    return settings;
}
export function getMigrationStatus() {
    const statusStr = localStorage.getItem(MIGRATION_KEY);
    if (!statusStr)
        return null;
    try {
        return JSON.parse(statusStr);
    }
    catch (e) {
        return null;
    }
}
function saveMigrationStatus(status) {
    localStorage.setItem(MIGRATION_KEY, JSON.stringify(status));
}
function convertToPerformanceLogRecord(log) {
    let date;
    if (log.timestamp) {
        date = log.timestamp.split('T')[0];
    }
    else if (log.date) {
        date = log.date;
    }
    return {
        ...log,
        version: log.version || 'perf-1',
        date,
        syncedToGit: false,
        deviceId: getDeviceId()
    };
}
function getDeviceId() {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
}
export async function migrateLocalStorageToIndexedDB() {
    const existingStatus = getMigrationStatus();
    if (existingStatus?.completed) {
        console.log('Migration already completed at', existingStatus.completedAt);
        return existingStatus;
    }
    const status = {
        version: 1,
        completed: false,
        performanceLogsMigrated: 0,
        settingsMigrated: 0,
        errors: []
    };
    try {
        await db.open();
        console.log('Migrating performance logs from localStorage...');
        const logs = extractPerformanceLogsFromLocalStorage();
        for (const log of logs) {
            try {
                const record = convertToPerformanceLogRecord(log);
                await db.addPerformanceLog(record);
                status.performanceLogsMigrated++;
            }
            catch (e) {
                const error = `Failed to migrate log for ${log.workoutFile}: ${e}`;
                console.error(error);
                status.errors.push(error);
            }
        }
        console.log(`Migrated ${status.performanceLogsMigrated} performance logs`);
        console.log('Migrating settings from localStorage...');
        const settings = extractSettingsFromLocalStorage();
        for (const [key, value] of Object.entries(settings)) {
            try {
                await db.setSetting(key, value);
                status.settingsMigrated++;
            }
            catch (e) {
                const error = `Failed to migrate setting ${key}: ${e}`;
                console.error(error);
                status.errors.push(error);
            }
        }
        console.log(`Migrated ${status.settingsMigrated} settings`);
        status.completed = true;
        status.completedAt = new Date().toISOString();
        saveMigrationStatus(status);
        console.log('Migration completed successfully!');
        return status;
    }
    catch (e) {
        const error = `Migration failed: ${e}`;
        console.error(error);
        status.errors.push(error);
        saveMigrationStatus(status);
        throw e;
    }
}
export async function rollbackMigration() {
    console.log('Rolling back migration...');
    try {
        await db.open();
        await db.clearAllData();
        localStorage.removeItem(MIGRATION_KEY);
        console.log('Migration rolled back successfully');
    }
    catch (e) {
        console.error('Rollback failed:', e);
        throw e;
    }
}
export async function exportToLocalStorage() {
    console.log('Exporting IndexedDB data to localStorage...');
    try {
        await db.open();
        const data = await db.exportAllData();
        data.performanceLogs.forEach((log, index) => {
            const key = `idb_backup_perflog_${index}`;
            localStorage.setItem(key, JSON.stringify(log));
        });
        data.userSettings.forEach(setting => {
            const key = `idb_backup_setting_${setting.key}`;
            localStorage.setItem(key, JSON.stringify(setting));
        });
        console.log('Export completed');
    }
    catch (e) {
        console.error('Export failed:', e);
        throw e;
    }
}
export async function autoMigrate() {
    const status = getMigrationStatus();
    if (!status || !status.completed) {
        console.log('Auto-migration starting...');
        try {
            await migrateLocalStorageToIndexedDB();
        }
        catch (e) {
            console.error('Auto-migration failed:', e);
        }
    }
}
//# sourceMappingURL=migration.js.map