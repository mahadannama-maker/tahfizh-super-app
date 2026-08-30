const CACHE_NAME = 'tahfizh-pwa-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './style.css',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Caching warning (some non-critical assets skipped):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network First with Cache Fallback for API, Cache First for Shell)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jika request ke Google Apps Script (API), gunakan Network First
  if (requestUrl.hostname.includes('script.google.com')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return new Response(JSON.stringify({
            status: 'offline',
            message: 'Anda sedang offline. Menampilkan data lokal yang tersimpan.'
          }), { headers: { 'Content-Type': 'application/json' } });
        })
    );
    return;
  }

  // Untuk aset lokal statis, gunakan Cache First with Network Fallback
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
