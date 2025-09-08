/* SW — cache app-shell + offline (robuste) */
const CACHE_VERSION = 'v1.0.9';
const BASE = self.registration.scope;

const ASSETS = [
  '',
  'index.html',
  'manifest.webmanifest',
  // Ajoute tes icônes si elles existent :
  // 'assets/icons/icon-192.png',
  // 'assets/icons/icon-512.png'
].map(p => new URL(p, BASE).toString());

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    await Promise.allSettled(ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res && res.ok && res.type !== 'opaque') await cache.put(url, res.clone());
      } catch(e){}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Navigations: network-first → fallback index ; autres GET: SWR */
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(new URL('index.html', BASE))));
    return;
  }

  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        if (res && res.ok && res.type !== 'opaque') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
  }
});
