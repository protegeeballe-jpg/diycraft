/* DIYCraft same-origin offline shell and game-engine cache. */
'use strict';
const CACHE_NAME = 'diycraft-shell-v71';

self.addEventListener('install', event => {
  const root = self.registration.scope;
  const pages = [
    root,
    new URL('index.html', root).href,
    new URL('linkedin.html', root).href,
    new URL('offline/', root).href,
    new URL('offline/index.html', root).href,
    new URL('diycraft.js', root).href,
    new URL('three-world-live.js', root).href,
    new URL('js/three-compact-hud.js', root).href,
    new URL('js/three.js', root).href,
    new URL('js/three-performance-profile.js', root).href,
    new URL('js/three-world-adapter.js', root).href,
    new URL('js/three-world-storage.js', root).href,
    new URL('js/three-world-starter.js', root).href,
    new URL('js/three-door-model.js', root).href,
    new URL('js/three-painterly-materials.js', root).href,
    new URL('js/three-plant-geometry.js', root).href,
    new URL('js/three-animal-geometry.js', root).href,
    new URL('js/three-world-protection.js', root).href,
    new URL('js/three-world-time.js', root).href,
    new URL('js/three-world-edit-sandbox.js', root).href,
    new URL('js/three-world-raycast.js', root).href,
    new URL('js/three-door-motion.js', root).href,
    new URL('js/three-player-physics.js', root).href,
    new URL('js/three-player-camera.js', root).href,
    new URL('js/three-player-model.js', root).href,
    new URL('js/three-neighbor-model.js', root).href,
    new URL('js/three-neighbor-coloring.js', root).href,
    new URL('manifest.json', root).href,
    new URL('diycraft-icon.svg', root).href,
    new URL('diycraft-icon-192.png', root).href,
    new URL('diycraft-icon-512.png', root).href
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
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache every same-origin production script for reliable offline startup.
  if (request.destination === 'script') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        return cached || Response.error();
      }
    })());
    return;
  }

  // The game engine is a shared same-origin asset used by both entry pages.
  // Serve the precached copy first so offline play works after installation.
  const gameScriptUrl = new URL('diycraft.js', self.registration.scope);
  if (url.pathname === gameScriptUrl.pathname) {
    // Prefer the latest published engine while online. Use the cached engine only
    // when offline, so an older installed worker cannot pin the game to stale code.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-cache' });
        if (response && response.ok) {
          await cache.put(gameScriptUrl.href, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await cache.match(gameScriptUrl.href);
        return cached || Response.error();
      }
    })());
    return;
  }

  if (request.mode !== 'navigate') return;

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
