const fs = require("fs");
const path = require("path");

function getFiles(dir, base = "", results = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.join(base, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, relPath, results);
    } else {
      results.push("/_next/static/" + relPath.replace(/\\/g, "/"));
    }
  }
  return results;
}

try {
  const staticPath = path.join(process.cwd(), ".next", "static");
  if (!fs.existsSync(staticPath)) {
    console.error(
      'Error: .next folder not found. Please run "next build" first.',
    );
    process.exit(1);
  }

  const staticFiles = getFiles(staticPath);
  console.log(`Found ${staticFiles.length} static assets in .next/static`);

  // We only care about JS and CSS and WASM for precaching logic (skip sourcemaps)
  const precacheList = [
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
    ...staticFiles.filter(
      (f) => f.match(/\.(js|css|wasm)$/) && !f.endsWith(".map"),
    ),
  ];

  const swContent = `
/**
 * Gemma 4 Aggressive Auto-Generated Precaching Service Worker
 * Generated on Build to include all internal Next.js assets.
 */

const CACHE_NAME = 'gemma-page-cache';
const PRE_CACHE = ${JSON.stringify(precacheList, null, 2)};

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
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.map((key) => {
                        if (key !== CACHE_NAME && key !== 'gemma-model-cache') {
                            return caches.delete(key);
                        }
                    })
                );
            }),
            caches.open('gemma-model-cache').then((cache) => {
                return cache.keys().then((requests) => {
                    return Promise.all(
                        requests.map((request) => {
                            if (request.url.includes('.task')) {
                                return cache.delete(request);
                            }
                        })
                    );
                });
            })
        ])
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Filter out huge model or non-http
    if (url.pathname.endsWith('.task') || url.pathname.endsWith('.litertlm') || !url.protocol.startsWith('http')) return;

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
`;

  fs.writeFileSync(path.join(process.cwd(), "public", "sw.js"), swContent);
  console.log(
    `Service Worker (sw.js) generated successfully with ${precacheList.length} assets.`,
  );
} catch (err) {
  console.error("Service worker generation failed:", err);
  process.exit(1);
}
