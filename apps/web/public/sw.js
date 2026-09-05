// RootLink service worker — offline READING only.
//
// Scope, deliberately: cached GET responses (trees, persons, media) stay
// viewable without a connection, and static app-shell assets load instantly
// on repeat visits. This does NOT queue writes made while offline — editing
// a person or uploading media still requires a connection. A real offline
// write-queue (local mutation log + conflict resolution on reconnect) is
// materially harder to get right than caching reads, and a half-built one
// that silently drops or double-applies changes is worse than not having
// it. Documented as a deliberate, disclosed scope cut rather than attempted
// and left unverified — see RootLink_Build_Continuation_Plan.md.
//
// Not verified in a real browser: this sandbox has no browser to load the
// app in, so this has been reviewed for logical correctness (cache API
// usage, event handling) but not manually QA'd against real navigation,
// install prompts, or update flows. Test before treating it as production
// ready — particularly the activate-time cache cleanup and the offline
// fallback page.

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `rootlink-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `rootlink-runtime-${CACHE_VERSION}`;
const API_CACHE = `rootlink-api-${CACHE_VERSION}`;

const SHELL_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE, API_CACHE]);
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/v1/');
}

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/');
}

// Stale-while-revalidate: serve the cached copy immediately if present,
// and refresh the cache from the network in the background. This means a
// previously-viewed tree/person/media list shows instantly and works
// offline, but never blocks on a slow network when a cached copy exists.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);

  return cached ?? (await networkFetch) ?? new Response(
    JSON.stringify({
      success: false,
      error: { code: 'OFFLINE', message: 'You are offline and this has not been loaded before.' },
    }),
    { status: 503, headers: { 'Content-Type': 'application/json' } },
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET requests are ever intercepted — writes (POST/PATCH/PUT/DELETE)
  // always go straight to the network, untouched, per the offline-reading-
  // only scope above. Intercepting a write and serving a cached response
  // for it would be a correctness bug, not a feature.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Full-page navigations: try the network first (so logged-in users
  // always see fresh app shell/auth state when online), fall back to the
  // cached offline page when there's no connection at all.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/offline')) ?? Response.error();
      }),
    );
  }
});
