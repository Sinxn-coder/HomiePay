// HomiePay Service Worker v6 — Full Offline Support (iOS + Android)
// ─────────────────────────────────────────────────────────────────────────────
// HOW THIS WORKS:
//   1. On INSTALL:  pre-cache the root HTML page (the app shell)
//   2. On FETCH:    Three strategies depending on request type:
//      a) Navigation (HTML page) → Network-first, fallback to cached shell
//      b) Static assets (/_next/static/) → Cache-first (immutable files with hashes)
//      c) Everything else → Cache-first with network fallback
//   3. All successful network responses are saved to cache automatically,
//      so after ONE online visit the entire app works offline forever.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'homiepay-v6';

// We only pre-cache the root HTML shell during install.
// All JS/CSS bundles are cached at runtime on first visit (see fetch handler).
const PRECACHE_URLS = [
  './',
  'manifest.json',
  'icon-512x512.png',
  'apple-icon.png',
  'nexlytelight.png',
  'nexlytedark.png',
  'favicon.ico'
];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Pre-cache individually so one 404 doesn't break the whole install
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
        } catch (e) {
          console.warn('[SW] Pre-cache failed for:', url, e.message);
        }
      }
      console.log('[SW] Installed and pre-cached shell');
    })()
  );
  // Activate the new SW immediately, don't wait for old tabs to close
  self.skipWaiting();
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete all old cache versions
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
      // Take control of all open clients immediately
      await self.clients.claim();
      console.log('[SW] Activated and claimed clients');
    })()
  );
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Only handle http/https (skip ws://, chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Skip HMR websocket (dev only – won't appear in production)
  if (url.pathname.includes('webpack-hmr')) return;

  // ── Strategy A: Navigation requests (loading the page) ───────────────────
  // Network-first: try to get a fresh page, but if offline serve the cached shell.
  // This is what happens when a user opens the PWA — if offline we MUST return
  // the cached HTML or the browser shows its own "no internet" page.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          // Try network first
          const networkResponse = await fetch(request);
          // Cache the fresh HTML for next time
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (_) {
          // Offline — serve the cached shell
          console.log('[SW] Offline navigation — serving cached shell');
          const cached =
            (await cache.match(request)) ||
            (await cache.match('./')) ||
            (await cache.match(new URL('./', self.location.href).href));
          if (cached) return cached;
          // Absolute last resort
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8">
             <meta name="viewport" content="width=device-width,initial-scale=1">
             <title>HomiePay — Offline</title>
             <style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;
             align-items:center;justify-content:center;height:100vh;margin:0;background:#f0fdf4;color:#065f46}
             h1{font-size:1.5rem}p{opacity:.7;font-size:.9rem}</style></head>
             <body><h1>📶 You're offline</h1>
             <p>Open HomiePay once online to enable offline mode.</p></body></html>`,
            { status: 200, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })()
    );
    return;
  }

  // ── Strategy B: Next.js static assets (JS bundles, CSS, fonts) ───────────
  // Cache-first: these files have content hashes in their names so they are
  // safe to serve from cache forever. Caching them is ESSENTIAL for offline.
  if (url.pathname.includes('/_next/static/') || url.pathname.includes('/_next/media/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        // Not cached yet — fetch and store
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (_) {
          return new Response('', { status: 408, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // ── Strategy C: Everything else (images, fonts, API calls, etc.) ─────────
  // Cache-first with network fallback and background refresh
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) {
        // Serve from cache and refresh in background
        fetch(request)
          .then((res) => { if (res.ok) cache.put(request, res); })
          .catch(() => {});
        return cached;
      }
      // Not in cache — try network
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch (_) {
        return new Response('', { status: 408, statusText: 'Offline' });
      }
    })()
  );
});

// ─── PUSH NOTIFICATIONS ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'HomiePay Update';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: data.icon || '/icon-512x512.png',
      badge: data.badge || '/icon-512x512.png',
      data: data.url || '/', // URL to open on click
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('[SW] Error parsing push data:', err);
    // Fallback if not JSON
    event.waitUntil(
      self.registration.showNotification('HomiePay Update', {
        body: event.data.text(),
        icon: '/icon-512x512.png',
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
