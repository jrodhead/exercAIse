/**
 * Storage Adapter
 * Unified interface for data persistence with IndexedDB (primary) and localStorage (fallback)
 */

import { db } from './db.js';
import { autoMigrate, getMigrationStatus } from './migration.js';
import type { PerformanceLog } from '../types/performance.types';
import type { PerformanceLogRecord, QueryOptions } from '../types/db.types';

// ============================================================================
// Storage Strategy
// ============================================================================

type StorageBackend = 'indexeddb' | 'localstorage';

export class StorageAdapter {
  private backend: StorageBackend = 'localstorage';
  private migrationAttempted = false;

  /**
   * Initialize storage (auto-migrates if needed)
   */
  async init(): Promise<void> {
    if (this.migrationAttempted) return;
    
    try {
      // Check if IndexedDB is available
      if (!window.indexedDB) {
        console.warn('IndexedDB not available, using localStorage');
        this.backend = 'localstorage';
        return;
      }
      
      // Attempt auto-migration
      await autoMigrate();
      
      // If migration completed, switch to IndexedDB
      const status = getMigrationStatus();
      if (status?.completed) {
        this.backend = 'indexeddb';
        console.log('Using IndexedDB backend');
      } else {
        console.log('Using localStorage backend (migration pending)');
      }
      
    } catch (e) {
      console.error('Storage initialization failed, falling back to localStorage:', e);
      this.backend = 'localstorage';
    } finally {
      this.migrationAttempted = true;
    }
  }

  /**
   * Get current backend
   */
  getBackend(): StorageBackend {
    return this.backend;
  }

  /**
   * Reset state (for testing only)
   * @internal
   */
  _resetForTesting(): void {
    this.backend = 'localstorage';
    this.migrationAttempted = false;
  }

  // ============================================================================
  // Performance Log Operations
  // ============================================================================

  /**
   * Save a performance log
   */
  async savePerformanceLog(log: PerformanceLog): Promise<void> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      try {
        const record: PerformanceLogRecord = {
          ...log,
          version: log.version || 'perf-1',
          date: log.timestamp?.split('T')[0] || log.date,
          syncedToGit: false
        };
        await db.addPerformanceLog(record);
      } catch (e) {
        console.error('IndexedDB save failed, falling back to localStorage:', e);
        this.saveToLocalStorage(log);
      }
    } else {
      this.saveToLocalStorage(log);
    }
  }

  /**
   * Get performance logs for a specific workout
   */
  async getPerformanceLogs(workoutFile: string, options?: QueryOptions): Promise<PerformanceLog[]> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      try {
        return await db.getPerformanceLogsByWorkout(workoutFile, options);
      } catch (e) {
        console.error('IndexedDB query failed, falling back to localStorage:', e);
        return this.getFromLocalStorage(workoutFile);
      }
    } else {
      return this.getFromLocalStorage(workoutFile);
    }
  }

  /**
   * Get all performance logs
   */
  async getAllPerformanceLogs(options?: QueryOptions): Promise<PerformanceLog[]> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      try {
        return await db.getAllPerformanceLogs(options);
      } catch (e) {
        console.error('IndexedDB query failed, falling back to localStorage:', e);
        return this.getAllFromLocalStorage();
      }
    } else {
      return this.getAllFromLocalStorage();
    }
  }

  /**
   * Get recent performance logs (last N workouts)
   */
  async getRecentPerformanceLogs(limit: number = 10): Promise<PerformanceLog[]> {
    return this.getAllPerformanceLogs({ limit, orderBy: 'desc' });
  }

  // ============================================================================
  // Settings Operations
  // ============================================================================

  /**
   * Get a setting value
   */
  async getSetting<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      try {
        const record = await db.getSetting(key);
        return record?.value ?? defaultValue;
      } catch (e) {
        console.error('IndexedDB setting query failed, falling back to localStorage:', e);
        return this.getSettingFromLocalStorage(key, defaultValue);
      }
    } else {
      return this.getSettingFromLocalStorage(key, defaultValue);
    }
  }

  /**
   * Set a setting value
   */
  async setSetting(key: string, value: any): Promise<void> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      try {
        await db.setSetting(key, value);
      } catch (e) {
        console.error('IndexedDB setting save failed, falling back to localStorage:', e);
        this.setSettingToLocalStorage(key, value);
      }
    } else {
      this.setSettingToLocalStorage(key, value);
    }
  }

  // ============================================================================
  // LocalStorage Fallback Methods
  // ============================================================================

  private saveToLocalStorage(log: PerformanceLog): void {
    const key = `perf_${log.workoutFile}_${log.timestamp || Date.now()}`;
    localStorage.setItem(key, JSON.stringify(log));
  }

  private getFromLocalStorage(workoutFile: string): PerformanceLog[] {
    const logs: PerformanceLog[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('perf_')) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const log = JSON.parse(value) as PerformanceLog;
        if (log.workoutFile === workoutFile) {
          logs.push(log);
        }
      } catch (e) {
        console.warn(`Failed to parse localStorage key ${key}:`, e);
      }
    }
    
    return logs;
  }

  private getAllFromLocalStorage(): PerformanceLog[] {
    const logs: PerformanceLog[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('perf_')) continue;
      
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const log = JSON.parse(value) as PerformanceLog;
        logs.push(log);
      } catch (e) {
        console.warn(`Failed to parse localStorage key ${key}:`, e);
      }
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => {
      const timeA = a.timestamp || '';
      const timeB = b.timestamp || '';
      return timeB.localeCompare(timeA);
    });
    
    return logs;
  }

  private getSettingFromLocalStorage<T>(key: string, defaultValue?: T): T | undefined {
    const value = localStorage.getItem(key);
    if (!value) return defaultValue;
    
    try {
      return JSON.parse(value);
    } catch (e) {
      // Not JSON, return as-is
      return value as any;
    }
  }

  private setSettingToLocalStorage(key: string, value: any): void {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Clear all data (both backends)
   */
  async clearAll(): Promise<void> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      await db.clearAllData();
    }
    
    // Also clear localStorage performance logs
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('perf_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Export all data
   */
  async exportAll(): Promise<any> {
    await this.init();
    
    if (this.backend === 'indexeddb') {
      return await db.exportAllData();
    } else {
      return {
        performanceLogs: this.getAllFromLocalStorage(),
        backend: 'localstorage'
      };
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const storage = new StorageAdapter();
