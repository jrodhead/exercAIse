/**
 * Vitest global test setup
 * Runs before all tests
 */

import { beforeAll, afterEach, vi } from 'vitest';

// Mock global objects that might be used in tests
beforeAll(() => {
  // Mock localStorage with full Storage API implementation
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value.toString();
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number): string | null => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }
    };
  })();
  
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  // Mock fetch for tests that need it
  global.fetch = vi.fn();
});

// Clean up after each test
afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});
