// Offline-first service worker: precache the entire app, serve from cache,
// update cache in the background. Bump VERSION when shipping changes.
const VERSION = 'lumioref-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/app.js',
  './js/data-loader.js',
  './js/ui/common.js',
  './js/ui/power.js',
  './js/ui/current.js',
  './js/ui/cable.js',
  './js/ui/vdrop.js',
  './js/ui/fuse.js',
  './js/ui/disconnect.js',
  './js/ui/selectivity.js',
  './js/ui/settings.js',
  './js/calc/power.js',
  './js/calc/current.js',
  './js/calc/cable.js',
  './js/calc/vdrop.js',
  './js/calc/fuse.js',
  './js/calc/disconnect.js',
  './js/calc/selectivity.js',
  './data/cec-2024/meta.json',
  './data/cec-2024/motor-flc.json',
  './data/cec-2024/ampacity.json',
  './data/cec-2024/derating.json',
  './data/cec-2024/impedance.json',
  './data/cec-2024/fuse.json',
  './data/cec-2024/disconnect.json',
  './data/cec-2024/selectivity.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first with background refresh (stale-while-revalidate).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => {
          if (res.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
