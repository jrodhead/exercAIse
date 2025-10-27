class ExercAIseDB {
    constructor() {
        this.db = null;
        this.dbName = 'exercAIse';
        this.version = 1;
    }
    async open() {
        if (this.db)
            return this.db;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                this.migrate({ db, transaction, oldVersion, newVersion });
            };
        });
    }
    migrate(context) {
        const { db, oldVersion } = context;
        if (oldVersion < 1) {
            const perfStore = db.createObjectStore('performanceLogs', {
                keyPath: 'id',
                autoIncrement: true
            });
            perfStore.createIndex('timestamp', 'timestamp', { unique: false });
            perfStore.createIndex('workoutFile', 'workoutFile', { unique: false });
            perfStore.createIndex('date', 'date', { unique: false });
            perfStore.createIndex('blockWeek', ['block', 'week'], { unique: false });
            const workoutStore = db.createObjectStore('workoutHistory', {
                keyPath: 'id',
                autoIncrement: true
            });
            workoutStore.createIndex('workoutFile', 'workoutFile', { unique: true });
            workoutStore.createIndex('lastPerformed', 'lastPerformed', { unique: false });
            workoutStore.createIndex('timesPerformed', 'timesPerformed', { unique: false });
            db.createObjectStore('userSettings', { keyPath: 'key' });
            const exerciseStore = db.createObjectStore('exerciseHistory', {
                keyPath: 'id',
                autoIncrement: true
            });
            exerciseStore.createIndex('exerciseKey', 'exerciseKey', { unique: true });
            exerciseStore.createIndex('lastPerformed', 'lastPerformed', { unique: false });
            exerciseStore.createIndex('timesPerformed', 'timesPerformed', { unique: false });
            exerciseStore.createIndex('logType', 'logType', { unique: false });
        }
    }
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
    async addPerformanceLog(log) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readwrite');
            const store = transaction.objectStore('performanceLogs');
            const request = store.add(log);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getPerformanceLog(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readonly');
            const store = transaction.objectStore('performanceLogs');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getAllPerformanceLogs(options) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readonly');
            const store = transaction.objectStore('performanceLogs');
            const request = store.getAll();
            request.onsuccess = () => {
                let results = request.result;
                if (options?.orderBy === 'desc') {
                    results = results.reverse();
                }
                if (options?.offset !== undefined || options?.limit !== undefined) {
                    const start = options.offset || 0;
                    const end = options.limit ? start + options.limit : undefined;
                    results = results.slice(start, end);
                }
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async getPerformanceLogsByWorkout(workoutFile, options) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readonly');
            const store = transaction.objectStore('performanceLogs');
            const index = store.index('workoutFile');
            const request = index.getAll(workoutFile);
            request.onsuccess = () => {
                let results = request.result;
                if (options?.orderBy === 'desc') {
                    results = results.reverse();
                }
                if (options?.offset !== undefined || options?.limit !== undefined) {
                    const start = options.offset || 0;
                    const end = options.limit ? start + options.limit : undefined;
                    results = results.slice(start, end);
                }
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async getPerformanceLogsByDateRange(query) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readonly');
            const store = transaction.objectStore('performanceLogs');
            const index = store.index('date');
            const range = IDBKeyRange.bound(query.start, query.end);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getPerformanceLogsByBlock(query) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readonly');
            const store = transaction.objectStore('performanceLogs');
            const index = store.index('blockWeek');
            const range = query.week !== undefined
                ? IDBKeyRange.only([query.block, query.week])
                : IDBKeyRange.bound([query.block, 0], [query.block, 99]);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async updatePerformanceLog(id, updates) {
        const db = await this.open();
        const existing = await this.getPerformanceLog(id);
        if (!existing)
            throw new Error(`Performance log ${id} not found`);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readwrite');
            const store = transaction.objectStore('performanceLogs');
            const updated = { ...existing, ...updates, id };
            const request = store.put(updated);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async deletePerformanceLog(id) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('performanceLogs', 'readwrite');
            const store = transaction.objectStore('performanceLogs');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async addOrUpdateWorkoutHistory(workout) {
        const db = await this.open();
        const existing = await this.getWorkoutHistoryByFile(workout.workoutFile);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('workoutHistory', 'readwrite');
            const store = transaction.objectStore('workoutHistory');
            const record = existing
                ? { ...existing, ...workout, id: existing.id, updatedAt: new Date().toISOString() }
                : { ...workout, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            const request = existing ? store.put(record) : store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getWorkoutHistoryByFile(workoutFile) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('workoutHistory', 'readonly');
            const store = transaction.objectStore('workoutHistory');
            const index = store.index('workoutFile');
            const request = index.get(workoutFile);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getAllWorkoutHistory(options) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('workoutHistory', 'readonly');
            const store = transaction.objectStore('workoutHistory');
            const request = store.getAll();
            request.onsuccess = () => {
                let results = request.result;
                if (options?.orderBy === 'desc') {
                    results = results.reverse();
                }
                if (options?.offset !== undefined || options?.limit !== undefined) {
                    const start = options.offset || 0;
                    const end = options.limit ? start + options.limit : undefined;
                    results = results.slice(start, end);
                }
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async getSetting(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('userSettings', 'readonly');
            const store = transaction.objectStore('userSettings');
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async setSetting(key, value) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('userSettings', 'readwrite');
            const store = transaction.objectStore('userSettings');
            const record = {
                key,
                value,
                updatedAt: new Date().toISOString()
            };
            const request = store.put(record);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async deleteSetting(key) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('userSettings', 'readwrite');
            const store = transaction.objectStore('userSettings');
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
    async addOrUpdateExerciseHistory(exercise) {
        const db = await this.open();
        const existing = await this.getExerciseHistoryByKey(exercise.exerciseKey);
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('exerciseHistory', 'readwrite');
            const store = transaction.objectStore('exerciseHistory');
            const record = existing
                ? { ...existing, ...exercise, id: existing.id, updatedAt: new Date().toISOString() }
                : { ...exercise, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
            const request = existing ? store.put(record) : store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getExerciseHistoryByKey(exerciseKey) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('exerciseHistory', 'readonly');
            const store = transaction.objectStore('exerciseHistory');
            const index = store.index('exerciseKey');
            const request = index.get(exerciseKey);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    async getAllExerciseHistory(options) {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('exerciseHistory', 'readonly');
            const store = transaction.objectStore('exerciseHistory');
            const request = store.getAll();
            request.onsuccess = () => {
                let results = request.result;
                if (options?.orderBy === 'desc') {
                    results = results.reverse();
                }
                if (options?.offset !== undefined || options?.limit !== undefined) {
                    const start = options.offset || 0;
                    const end = options.limit ? start + options.limit : undefined;
                    results = results.slice(start, end);
                }
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    async clearAllData() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['performanceLogs', 'workoutHistory', 'userSettings', 'exerciseHistory'], 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            const stores = ['performanceLogs', 'workoutHistory', 'userSettings', 'exerciseHistory'];
            stores.forEach(storeName => {
                transaction.objectStore(storeName).clear();
            });
        });
    }
    async exportAllData() {
        const [performanceLogs, workoutHistory, userSettings, exerciseHistory] = await Promise.all([
            this.getAllPerformanceLogs(),
            this.getAllWorkoutHistory(),
            this.getAllSettings(),
            this.getAllExerciseHistory()
        ]);
        return { performanceLogs, workoutHistory, userSettings, exerciseHistory };
    }
    async getAllSettings() {
        const db = await this.open();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction('userSettings', 'readonly');
            const store = transaction.objectStore('userSettings');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}
export const db = new ExercAIseDB();
//# sourceMappingURL=db.js.map