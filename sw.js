const CACHE_NAME = 'family-tracker-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  // Do NOT cache GitHub API Database queries! We always want fresh tasks.
  if (event.request.url.includes('api.github.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached version if found, else fetch normally.
      return response || fetch(event.request);
    })
  );
});
