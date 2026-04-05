
/**
 * Gemma 4 Aggressive Auto-Generated Precaching Service Worker
 * Generated on Build to include all internal Next.js assets.
 */

const CACHE_NAME = 'gemma-page-cache';
const PRE_CACHE = [
  "/",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
  "/web-app-manifest-192x192.png",
  "/web-app-manifest-512x512.png",
  "/apple-icon.png",
  "/icon0.svg",
  "/icon1.png",
  "/favicon.ico",
  "/_next/static/chunks/02ygzi3a-inzf.js",
  "/_next/static/chunks/03~yq9q893hmn.js",
  "/_next/static/chunks/094iy9baovbd8.css",
  "/_next/static/chunks/0bn7sb9dt40_4.js",
  "/_next/static/chunks/0j-yjan8jn-8-.js",
  "/_next/static/chunks/0l4e3as18eexy.js",
  "/_next/static/chunks/0th5h4aspyky3.js",
  "/_next/static/chunks/turbopack-0klzyfo_-gpj6.js",
  "/_next/static/srn0MpZaoJYz84dOS38El/_buildManifest.js",
  "/_next/static/srn0MpZaoJYz84dOS38El/_clientMiddlewareManifest.js",
  "/_next/static/srn0MpZaoJYz84dOS38El/_ssgManifest.js"
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Chunk the pre-cache to avoid browser bottlenecks on 100+ files
            const addAllInChunks = async (files) => {
                const CHUNK_SIZE = 10;
                for (let i = 0; i < files.length; i += CHUNK_SIZE) {
                    const chunk = files.slice(i, i + CHUNK_SIZE);
                    await Promise.allSettled(chunk.map(f => cache.add(f)));
                }
            };
            return addAllInChunks(PRE_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== 'gemma-model-cache') {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Filter out huge model or non-http
    if (url.pathname.endsWith('.task') || !url.protocol.startsWith('http')) return;

    // Fast response for anything already in PRE_CACHE or same-origin static
    const isInternal = (
        url.origin === self.location.origin && 
        (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/static/'))
    );

    const isCdn = url.hostname.includes('jsdelivr.net') || 
                  url.hostname.includes('fonts.googleapis.com') ||
                  url.hostname.includes('fonts.gstatic.com');

    if (isInternal || isCdn) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                // Stale-While-Revalidate: Return cached immediately, then update cache in background
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    if (networkResponse.ok) {
                        const clone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fail silently for background updates, cachedResponse already returned or will be below
                });

                return cachedResponse || fetchPromise;
            })
        );
        return;
    }

    // NAVIGATION: Network first for root / but update cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put('/', clone));
                    return response;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }
});
