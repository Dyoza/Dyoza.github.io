/* Service Worker — cache app-shell + offline */
const CACHE_VERSION = 'v1.0.3';
const BASE = self.registration.scope;

const ASSETS = [
  '',
  'index.html',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
].map(p => new URL(p, BASE).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* Navigations: network-first → fallback index (offline)
   Autres GET: stale-while-revalidate */
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(new URL('index.html', BASE)))
    );
    return;
  }

  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
  }
});
