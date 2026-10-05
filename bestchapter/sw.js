// Service Worker v5 — caches app shell + card images for full offline use
const CACHE_SHELL  = 'vc-shell-v5';
const CACHE_IMAGES = 'vc-images-v1';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/swipe-hint.json',
  '/icon-192.png',
  '/icon-512.png',
  '/loader-icon.png',
  '/brand-logo.png',
  '/config.json'
];

// ── Install: cache shell files ────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_SHELL).then(c => c.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_SHELL && k !== CACHE_IMAGES)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1. HTML — always network first, never serve stale index.html
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 2. Card images — cache first, then network, update cache in background
  //    This means images load instantly on repeat visits even offline
  if (url.pathname.includes('/images/')) {
    e.respondWith(
      caches.open(CACHE_IMAGES).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) {
          // Serve cached, refresh in background
          fetch(e.request).then(res => {
            if (res.ok) cache.put(e.request, res);
          }).catch(() => {});
          return cached;
        }
        // Not cached — fetch, cache, and return
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // 3. Shell files — cache first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res.ok) {
          caches.open(CACHE_SHELL).then(c => c.put(e.request, res.clone()));
        }
        return res;
      })
    )
  );
});
