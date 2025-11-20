// Service Worker for LibSync Admin PWA
const CACHE_NAME = 'libsync-admin-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/logo-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Cache failed', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Don't cache chrome-extension, chrome:, data:, blob:, or other non-http(s) URLs
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return; // Let browser handle non-http(s) requests normally
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request)
          .then((response) => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Only cache http/https URLs
            const requestUrl = new URL(event.request.url);
            if (requestUrl.protocol === 'http:' || requestUrl.protocol === 'https:') {
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache).catch((err) => {
                    // Silently fail if caching fails (e.g., chrome-extension URLs)
                    console.warn('Service Worker: Failed to cache', event.request.url, err);
                  });
                });
            }

            return response;
          });
      })
      .catch(() => {
        // Return offline page or fallback if available
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

