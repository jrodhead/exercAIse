import { db } from './db.js';
import { autoMigrate, getMigrationStatus } from './migration.js';
export class StorageAdapter {
    constructor() {
        this.backend = 'localstorage';
        this.migrationAttempted = false;
    }
    async init() {
        if (this.migrationAttempted)
            return;
        try {
            if (!window.indexedDB) {
                console.warn('IndexedDB not available, using localStorage');
                this.backend = 'localstorage';
                return;
            }
            await autoMigrate();
            const status = getMigrationStatus();
            if (status?.completed) {
                this.backend = 'indexeddb';
                console.log('Using IndexedDB backend');
            }
            else {
                console.log('Using localStorage backend (migration pending)');
            }
        }
        catch (e) {
            console.error('Storage initialization failed, falling back to localStorage:', e);
            this.backend = 'localstorage';
        }
        finally {
            this.migrationAttempted = true;
        }
    }
    getBackend() {
        return this.backend;
    }
    _resetForTesting() {
        this.backend = 'localstorage';
        this.migrationAttempted = false;
    }
    async savePerformanceLog(log) {
        await this.init();
        if (this.backend === 'indexeddb') {
            try {
                const record = {
                    ...log,
                    version: log.version || 'perf-1',
                    date: log.timestamp?.split('T')[0] || log.date,
                    syncedToGit: false
                };
                await db.addPerformanceLog(record);
            }
            catch (e) {
                console.error('IndexedDB save failed, falling back to localStorage:', e);
                this.saveToLocalStorage(log);
            }
        }
        else {
            this.saveToLocalStorage(log);
        }
    }
    async getPerformanceLogs(workoutFile, options) {
        await this.init();
        if (this.backend === 'indexeddb') {
            try {
                return await db.getPerformanceLogsByWorkout(workoutFile, options);
            }
            catch (e) {
                console.error('IndexedDB query failed, falling back to localStorage:', e);
                return this.getFromLocalStorage(workoutFile);
            }
        }
        else {
            return this.getFromLocalStorage(workoutFile);
        }
    }
    async getAllPerformanceLogs(options) {
        await this.init();
        if (this.backend === 'indexeddb') {
            try {
                return await db.getAllPerformanceLogs(options);
            }
            catch (e) {
                console.error('IndexedDB query failed, falling back to localStorage:', e);
                return this.getAllFromLocalStorage();
            }
        }
        else {
            return this.getAllFromLocalStorage();
        }
    }
    async getRecentPerformanceLogs(limit = 10) {
        return this.getAllPerformanceLogs({ limit, orderBy: 'desc' });
    }
    async getSetting(key, defaultValue) {
        await this.init();
        if (this.backend === 'indexeddb') {
            try {
                const record = await db.getSetting(key);
                return record?.value ?? defaultValue;
            }
            catch (e) {
                console.error('IndexedDB setting query failed, falling back to localStorage:', e);
                return this.getSettingFromLocalStorage(key, defaultValue);
            }
        }
        else {
            return this.getSettingFromLocalStorage(key, defaultValue);
        }
    }
    async setSetting(key, value) {
        await this.init();
        if (this.backend === 'indexeddb') {
            try {
                await db.setSetting(key, value);
            }
            catch (e) {
                console.error('IndexedDB setting save failed, falling back to localStorage:', e);
                this.setSettingToLocalStorage(key, value);
            }
        }
        else {
            this.setSettingToLocalStorage(key, value);
        }
    }
    saveToLocalStorage(log) {
        const key = `perf_${log.workoutFile}_${log.timestamp || Date.now()}`;
        localStorage.setItem(key, JSON.stringify(log));
    }
    getFromLocalStorage(workoutFile) {
        const logs = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('perf_'))
                continue;
            try {
                const value = localStorage.getItem(key);
                if (!value)
                    continue;
                const log = JSON.parse(value);
                if (log.workoutFile === workoutFile) {
                    logs.push(log);
                }
            }
            catch (e) {
                console.warn(`Failed to parse localStorage key ${key}:`, e);
            }
        }
        return logs;
    }
    getAllFromLocalStorage() {
        const logs = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith('perf_'))
                continue;
            try {
                const value = localStorage.getItem(key);
                if (!value)
                    continue;
                const log = JSON.parse(value);
                logs.push(log);
            }
            catch (e) {
                console.warn(`Failed to parse localStorage key ${key}:`, e);
            }
        }
        logs.sort((a, b) => {
            const timeA = a.timestamp || '';
            const timeB = b.timestamp || '';
            return timeB.localeCompare(timeA);
        });
        return logs;
    }
    getSettingFromLocalStorage(key, defaultValue) {
        const value = localStorage.getItem(key);
        if (!value)
            return defaultValue;
        try {
            return JSON.parse(value);
        }
        catch (e) {
            return value;
        }
    }
    setSettingToLocalStorage(key, value) {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, serialized);
    }
    async clearAll() {
        await this.init();
        if (this.backend === 'indexeddb') {
            await db.clearAllData();
        }
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('perf_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    async exportAll() {
        await this.init();
        if (this.backend === 'indexeddb') {
            return await db.exportAllData();
        }
        else {
            return {
                performanceLogs: this.getAllFromLocalStorage(),
                backend: 'localstorage'
            };
        }
    }
}
export const storage = new StorageAdapter();
//# sourceMappingURL=storage.js.map