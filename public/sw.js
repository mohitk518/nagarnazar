/*
 * NagarNazar service worker (RunUp Coders Hackathon 2026 — offline-ready PWA).
 *
 * - App shell: "/", "/report", manifest and icons are cached on install, so the app
 *   opens and the report form works without a network.
 * - /assets/* (hashed, immutable build files): cache-first.
 * - Page navigations: network-first, falling back to the cached page, then the cached shell.
 * - Fonts and the Leaflet stylesheet: stale-while-revalidate.
 * - Never cached: anything that is not GET, /api/*, Supabase (data, auth, photos) and other
 *   third-party requests. Complaint data always comes live; drafts live in IndexedDB.
 */
const VERSION = "nn-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const SHELL_URLS = [
  "/",
  "/report",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];
const RUNTIME_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com", "unpkg.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Cache each URL on its own so one failure does not block install.
      await Promise.all(
        SHELL_URLS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => (res.ok ? cache.put(url, res) : undefined))
            .catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok || res.type === "opaque") cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit || (await network) || Response.error();
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const url = new URL(request.url);
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (url.pathname.startsWith("/report") ? await cache.match("/report") : undefined) ||
      (await cache.match("/")) ||
      new Response(
        "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>NagarNazar — offline</title><body style='font-family:system-ui;padding:2rem;background:#1E1B4B;color:#fff'><h1>Aap offline hain / You're offline</h1><p>Net aate hi dobara kholiye. Your drafts are safe on this phone.</p>",
        { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
      )
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api/")) return; // live data and AI, never cached
    if (request.mode === "navigate") {
      event.respondWith(networkFirstPage(request));
      return;
    }
    if (url.pathname.startsWith("/assets/")) {
      event.respondWith(cacheFirst(request));
      return;
    }
    if (
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.json" ||
      url.pathname === "/favicon.ico"
    ) {
      event.respondWith(staleWhileRevalidate(request));
    }
    return;
  }

  if (RUNTIME_HOSTS.includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Everything else (Supabase, map tiles, geocoding) goes straight to the network.
});
