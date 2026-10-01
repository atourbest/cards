// Service Worker — caches only static assets, never index.html
// This ensures the page logic always loads fresh from the network
const CACHE = 'vc-v4';
const STATIC = ['/icon-192.png', '/icon-512.png', '/swipe-hint.json', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Delete all old caches
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Never cache index.html — always fetch fresh from network
  if (url.pathname === '/' || url.pathname.endsWith('.html')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Card images — network first, no caching (keeps deck updates instant)
  if (url.pathname.includes('/images/')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 404 })));
    return;
  }

  // Static assets (icons, manifest, swipe-hint) — cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }))
  );
});
