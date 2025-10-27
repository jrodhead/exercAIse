import { storage } from '../lib/storage.js';
window.ExercAIse = window.ExercAIse || {};
window.ExercAIse.Storage = storage;
(async () => {
    try {
        await storage.init();
        console.log(`[Storage] Initialized with ${storage.getBackend()} backend`);
    }
    catch (error) {
        console.error('[Storage] Initialization failed:', error);
    }
})();
//# sourceMappingURL=storage-adapter.js.map