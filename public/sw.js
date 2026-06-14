const CACHE_NAME = 'prop_manage_cache_v2';
const PRE_CACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// On installation, cache core app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Clean up old caches during activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Intercept requests and serve with dynamic stale-while-revalidate strategy
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Focus caching primarily on local origin and asset resources
  const isLocalOrigin = url.origin === self.location.origin;
  const isImage8 = url.origin.includes('icons8.com');

  if (!isLocalOrigin && !isImage8) {
    return; // Pass-through for database read/write requests, GCP endpoints, etc.
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Silent catch for network failure when caching
        });

      // Return cached response instantly if available (stale-while-revalidate), or wait for network fetch
      return cachedResponse || fetchPromise;
    }).catch(() => {
      // Offline fallback: serve main index if user navigation request fails
      if (event.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
