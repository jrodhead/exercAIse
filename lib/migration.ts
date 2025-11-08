/**
 * LocalStorage to IndexedDB Migration
 * Migrates existing performance logs and settings from localStorage to IndexedDB
 */

import { db } from './db.js';
import type { PerformanceLog } from '../types/performance.types';
import type { PerformanceLogRecord } from '../types/db.types';

// ============================================================================
// Migration Status Tracking
// ============================================================================

const MIGRATION_KEY = 'indexeddb_migration_status';

interface MigrationStatus {
  version: number;
  completed: boolean;
  completedAt?: string;
  performanceLogsMigrated: number;
  settingsMigrated: number;
  errors: string[];
}

// ============================================================================
// LocalStorage Data Extraction
// ============================================================================

/**
 * Extract all performance logs from localStorage
 * Old format: keys like "workout_performed_<workoutFile>" or "perf_*"
 */
function extractPerformanceLogsFromLocalStorage(): PerformanceLog[] {
  const logs: PerformanceLog[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
    // Match old format: workout_performed_* or perf_*
    if (key.startsWith('workout_performed_') || key.startsWith('perf_')) {
      try {
        const value = localStorage.getItem(key);
        if (!value) continue;
        
        const data = JSON.parse(value);
        
        // Validate it looks like a performance log
        if (data && typeof data === 'object' && (data.exercises || data.workoutFile)) {
          logs.push(data as PerformanceLog);
        }
      } catch (e) {
        console.warn(`Failed to parse localStorage key ${key}:`, e);
      }
    }
  }
  
  return logs;
}

/**
 * Extract user settings from localStorage
 */
function extractSettingsFromLocalStorage(): Record<string, any> {
  const settings: Record<string, any> = {};
  
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
      } catch (e) {
        // Not JSON, store as-is
        settings[key] = value;
      }
    }
  }
  
  return settings;
}

// ============================================================================
// Migration Logic
// ============================================================================

/**
 * Check if migration has already been completed
 */
export function getMigrationStatus(): MigrationStatus | null {
  const statusStr = localStorage.getItem(MIGRATION_KEY);
  if (!statusStr) return null;
  
  try {
    return JSON.parse(statusStr);
  } catch (e) {
    return null;
  }
}

/**
 * Save migration status to localStorage
 */
function saveMigrationStatus(status: MigrationStatus): void {
  localStorage.setItem(MIGRATION_KEY, JSON.stringify(status));
}

/**
 * Convert PerformanceLog to PerformanceLogRecord with metadata
 */
function convertToPerformanceLogRecord(log: PerformanceLog): PerformanceLogRecord {
  // Extract date from timestamp or workoutFile
  let date: string | undefined;
  
  if (log.timestamp) {
    date = log.timestamp.split('T')[0]; // Extract YYYY-MM-DD
  } else if (log.date) {
    date = log.date;
  }
  
  return {
    ...log,
    version: log.version || 'perf-1',
    date,
    syncedToGit: false, // Assume not synced yet
    deviceId: getDeviceId()
  };
}

/**
 * Get or create a device identifier
 */
function getDeviceId(): string {
  let deviceId = localStorage.getItem('device_id');
  
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  
  return deviceId;
}

/**
 * Migrate all data from localStorage to IndexedDB
 */
export async function migrateLocalStorageToIndexedDB(): Promise<MigrationStatus> {
  // Check if already migrated
  const existingStatus = getMigrationStatus();
  if (existingStatus?.completed) {
    console.log('Migration already completed at', existingStatus.completedAt);
    return existingStatus;
  }
  
  const status: MigrationStatus = {
    version: 1,
    completed: false,
    performanceLogsMigrated: 0,
    settingsMigrated: 0,
    errors: []
  };
  
  try {
    // Open database connection
    await db.open();
    
    // Migrate performance logs
    console.log('Migrating performance logs from localStorage...');
    const logs = extractPerformanceLogsFromLocalStorage();
    
    for (const log of logs) {
      try {
        const record = convertToPerformanceLogRecord(log);
        await db.addPerformanceLog(record);
        status.performanceLogsMigrated++;
      } catch (e) {
        const error = `Failed to migrate log for ${log.workoutFile}: ${e}`;
        console.error(error);
        status.errors.push(error);
      }
    }
    
    console.log(`Migrated ${status.performanceLogsMigrated} performance logs`);
    
    // Migrate settings
    console.log('Migrating settings from localStorage...');
    const settings = extractSettingsFromLocalStorage();
    
    for (const [key, value] of Object.entries(settings)) {
      try {
        await db.setSetting(key, value);
        status.settingsMigrated++;
      } catch (e) {
        const error = `Failed to migrate setting ${key}: ${e}`;
        console.error(error);
        status.errors.push(error);
      }
    }
    
    console.log(`Migrated ${status.settingsMigrated} settings`);
    
    // Mark migration as complete
    status.completed = true;
    status.completedAt = new Date().toISOString();
    saveMigrationStatus(status);
    
    console.log('Migration completed successfully!');
    
    return status;
    
  } catch (e) {
    const error = `Migration failed: ${e}`;
    console.error(error);
    status.errors.push(error);
    saveMigrationStatus(status);
    throw e;
  }
}

/**
 * Rollback migration - clear IndexedDB and restore localStorage precedence
 */
export async function rollbackMigration(): Promise<void> {
  console.log('Rolling back migration...');
  
  try {
    await db.open();
    await db.clearAllData();
    localStorage.removeItem(MIGRATION_KEY);
    
    console.log('Migration rolled back successfully');
  } catch (e) {
    console.error('Rollback failed:', e);
    throw e;
  }
}

/**
 * Export IndexedDB data back to localStorage (for backup/recovery)
 */
export async function exportToLocalStorage(): Promise<void> {
  console.log('Exporting IndexedDB data to localStorage...');
  
  try {
    await db.open();
    const data = await db.exportAllData();
    
    // Export performance logs
    data.performanceLogs.forEach((log, index) => {
      const key = `idb_backup_perflog_${index}`;
      localStorage.setItem(key, JSON.stringify(log));
    });
    
    // Export settings
    data.userSettings.forEach(setting => {
      const key = `idb_backup_setting_${setting.key}`;
      localStorage.setItem(key, JSON.stringify(setting));
    });
    
    console.log('Export completed');
  } catch (e) {
    console.error('Export failed:', e);
    throw e;
  }
}

// ============================================================================
// Auto-migration on App Load
// ============================================================================

/**
 * Automatically run migration if needed when app loads
 */
export async function autoMigrate(): Promise<void> {
  const status = getMigrationStatus();
  
  if (!status || !status.completed) {
    console.log('Auto-migration starting...');
    try {
      await migrateLocalStorageToIndexedDB();
    } catch (e) {
      console.error('Auto-migration failed:', e);
      // Don't throw - allow app to continue with localStorage
    }
  }
}
