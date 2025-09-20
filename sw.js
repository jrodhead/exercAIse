// Basic service worker for exercAIse MVP
const CACHE_NAME = 'exercAIse-shell-v1';
const CORE_ASSETS = [
  './index.html',
  './exercise.html',
  './assets/styles.css',
  './assets/app.js',
  './assets/exercise.js',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network-first for API calls
  if (/\/api\//.test(req.url)) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ error: 'offline' }), { headers: { 'Content-Type': 'application/json' } }))
    );
    return;
  }
  // Cache-first for core/static assets
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(resp => {
      // Opportunistic cache populate
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return resp;
    }).catch(() => {
      if (req.destination === 'document') return caches.match('./index.html');
    }))
  );
});
