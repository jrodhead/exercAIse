/**
 * Vitest global test setup
 * Runs before all tests
 */

import { beforeAll, afterEach, vi } from 'vitest';

// Mock global objects that might be used in tests
beforeAll(() => {
  // Mock localStorage
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
