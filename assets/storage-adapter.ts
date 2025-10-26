/**
 * Storage Adapter Module
 * Exposes the unified storage interface to the application
 * Uses IndexedDB with localStorage fallback
 */

import { storage } from '../lib/storage.js';

// Expose storage adapter on window.ExercAIse
window.ExercAIse = window.ExercAIse || {};
window.ExercAIse.Storage = storage;

// Initialize storage on module load
(async () => {
  try {
    await storage.init();
    console.log(`[Storage] Initialized with ${storage.getBackend()} backend`);
  } catch (error) {
    console.error('[Storage] Initialization failed:', error);
  }
})();
