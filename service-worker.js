const CACHE_NAME = 'finora-supabase-v2.1.4';
const APP_SHELL = [
  './',
  './index.html',
  './login.html',
  './app/',
  './app/index.html',
  './assets/css/styles.css',
  './assets/js/config.js',
  './assets/js/app.js',
  './assets/icons/icon.svg',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

function fallbackFor(url) {
  const path = url.pathname.toLowerCase();
  if (path.endsWith('/login.html') || path.includes('/app/')) return './app/index.html';
  return './index.html';
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co') || url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(fallbackFor(url)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
