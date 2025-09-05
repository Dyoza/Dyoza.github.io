/* Service Worker simple — cache app-shell + offline */
const CACHE_VERSION = 'v1.0.1';
const BASE = self.registration.scope; 
// ex. 'https://<user>.github.io/transformation-app/' ou juste '/' si repo racine

const ASSETS = [
  '',                 // équivaut à index.html (fetch de la scope)
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

/* Stratégie :
   - requêtes de navigation (HTML) : network-first avec fallback offline (index)
   - le reste : stale-while-revalidate
*/
self.addEventListener('fetch', event => {
  const req = event.request;

  // 1) Navigations (tap sur liens, refresh…)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(new URL('index.html', BASE)))
    );
    return;
  }

  // 2) Autres GET (images, manifest…)
  if (req.method === 'GET') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then(res => {
        // met à jour le cache en arrière-plan si OK
        if (res && res.status === 200 && res.type !== 'opaque') {
          cache.put(req, res.clone());
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
  }
});
