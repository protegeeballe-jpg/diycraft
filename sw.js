/* DIYCraft same-origin offline shell cache.
   The game has no remote gameplay dependencies; only its own two HTML entry points are cached. */
'use strict';
const CACHE_NAME = 'diycraft-shell-v16';

self.addEventListener('install', event => {
  const root = self.registration.scope;
  const pages = [
    root,
    new URL('index.html', root).href,
    new URL('offline/', root).href,
    new URL('offline/index.html', root).href
  ];
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(pages))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('diycraft-shell-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Prefer a fresh published page while connected, then refresh its offline copy.
      const response = await fetch(request);
      if (response && response.ok) {
        const cleanUrl = new URL(request.url);
        cleanUrl.search = '';
        cleanUrl.hash = '';
        await cache.put(cleanUrl.href, response.clone());
      }
      return response;
    } catch (error) {
      // Query strings such as ?build=... do not prevent a cached page from opening.
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;

      const offlinePage = url.pathname.includes('/offline/');
      const fallback = new URL(offlinePage ? 'offline/index.html' : 'index.html', self.registration.scope);
      return (await cache.match(fallback.href)) || Response.error();
    }
  })());
});
