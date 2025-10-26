/**
 * Unit tests for unified storage adapter
 * Tests IndexedDB primary + localStorage fallback strategy
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from '../../lib/storage';
import { db } from '../../lib/db';
import type { PerformanceLog } from '../../types';

// Mock IndexedDB
import 'fake-indexeddb/auto';

describe('Storage Adapter', () => {
  beforeEach(async () => {
    // Clear migration status
    localStorage.clear();
    await db.open();
    await db.clearAllData();
    // Reset storage adapter state
    (storage as any)._resetForTesting();
  });

  afterEach(async () => {
    localStorage.clear();
    await db.clearAllData();
    db.close();
  });

  describe('Initialization', () => {
    it('should initialize with IndexedDB backend', async () => {
      await storage.init();
      
      const backend = storage.getBackend();
      expect(backend).toBe('indexeddb');
    });

    it('should migrate localStorage data on init', async () => {
      // Set up old localStorage data BEFORE init
      localStorage.setItem('perf_0', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      // Now initialize storage (triggers migration)
      await storage.init();

      const logs = await storage.getAllPerformanceLogs();
      expect(logs.length).toBe(1);
    });
  });

  describe('Performance Logs - IndexedDB', () => {
    it('should save performance log to IndexedDB', async () => {
      await storage.init();
      
      const log: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {
          'bench_press': {
            name: 'Bench Press',
            logType: 'strength',
            sets: [
              { set: 1, weight: 45, multiplier: 2, reps: 10, rpe: 7 }
            ]
          }
        }
      };

      await storage.savePerformanceLog(log);

      const logs = await storage.getAllPerformanceLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].workoutFile).toBe('workouts/upper.json');
    });

    it('should retrieve performance logs', async () => {
      await storage.init();
      
      const log1: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      };

      const log2: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/lower.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      };

      await storage.savePerformanceLog(log1);
      await storage.savePerformanceLog(log2);

      const all = await storage.getAllPerformanceLogs();
      expect(all.length).toBe(2);

      const upperLogs = await storage.getPerformanceLogs('workouts/upper.json');
      expect(upperLogs.length).toBe(1);
      expect(upperLogs[0].workoutFile).toBe('workouts/upper.json');
    });

    it('should retrieve recent performance logs', async () => {
      await storage.init();
      
      for (let i = 0; i < 15; i++) {
        await storage.savePerformanceLog({
          version: 'perf-1',
          workoutFile: `workouts/test${i}.json`,
          timestamp: `2025-10-${10 + i}T12:00:00Z`,
          exercises: {}
        });
      }

      const recent = await storage.getRecentPerformanceLogs(10);
      expect(recent.length).toBe(10);
    });
  });

  describe('Settings - IndexedDB', () => {
    it('should save and retrieve settings', async () => {
      await storage.init();
      
      await storage.setSetting('dark_mode', true);
      await storage.setSetting('user_name', 'Test User');

      const darkMode = await storage.getSetting('dark_mode');
      expect(darkMode).toBe(true);

      const userName = await storage.getSetting('user_name');
      expect(userName).toBe('Test User');
    });

    it('should update existing settings', async () => {
      await storage.init();
      
      await storage.setSetting('counter', 1);
      await storage.setSetting('counter', 2);

      const counter = await storage.getSetting('counter');
      expect(counter).toBe(2);
    });

    it('should handle complex setting values', async () => {
      await storage.init();
      
      const complexValue = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        }
      };

      await storage.setSetting('complex', complexValue);

      const retrieved = await storage.getSetting('complex');
      expect(retrieved).toEqual(complexValue);
    });
  });

  describe('Workout History - IndexedDB', () => {
    it('should save performance logs without auto-building history', async () => {
      await storage.init();
      
      const log1: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      };

      const log2: PerformanceLog = {
        version: 'perf-1',
        workoutFile: 'workouts/upper.json',
        timestamp: '2025-10-27T12:00:00Z',
        exercises: {}
      };

      await storage.savePerformanceLog(log1);
      await storage.savePerformanceLog(log2);

      const logs = await storage.getAllPerformanceLogs();
      expect(logs.length).toBe(2);
    });
  });

  describe('LocalStorage Fallback', () => {
    it('should use localStorage backend when IndexedDB unavailable', async () => {
      // Mock window.indexedDB as undefined
      const originalIndexedDB = (global as any).indexedDB;
      (global as any).indexedDB = undefined;
      
      await storage.init();
      
      const backend = storage.getBackend();
      expect(backend).toBe('localstorage');
      
      // Restore
      (global as any).indexedDB = originalIndexedDB;
    });

    it('should read from localStorage when in fallback mode', async () => {
      // Mock window.indexedDB as undefined to force localStorage mode
      const originalIndexedDB = (global as any).indexedDB;
      (global as any).indexedDB = undefined;
      
      await storage.init();

      // Add data directly to localStorage
      localStorage.setItem('perf_test', JSON.stringify({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      }));

      const logs = await storage.getAllPerformanceLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].workoutFile).toBe('workouts/test.json');
      
      // Restore
      (global as any).indexedDB = originalIndexedDB;
    });
  });

  describe('Data Export', () => {
    it('should export all data via IndexedDB', async () => {
      await storage.init();
      
      await storage.savePerformanceLog({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      });

      await storage.setSetting('test_setting', 'value');

      const exported = await db.exportAllData();

      expect(exported.performanceLogs.length).toBe(1);
      expect(exported.userSettings.length).toBeGreaterThan(0);
    });
  });

  describe('Data Clearing', () => {
    it('should clear all data via IndexedDB', async () => {
      await storage.init();
      
      await storage.savePerformanceLog({
        version: 'perf-1',
        workoutFile: 'workouts/test.json',
        timestamp: '2025-10-26T12:00:00Z',
        exercises: {}
      });

      await storage.setSetting('test', 'value');

      await db.clearAllData();

      const logs = await storage.getAllPerformanceLogs();
      const setting = await storage.getSetting('test');

      expect(logs.length).toBe(0);
      expect(setting).toBeUndefined();
    });
  });
});
