// Al-Jidh Sport service worker: app shell offline, last-known data when the network drops.
const VERSION = "ajs-v1";
const SHELL = [
  "./", "index.html", "app.css", "app.js", "registry.js", "hero.js", "manifest.webmanifest", "data/demo.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "icons/favicon-48.png",
  "fonts/barlow-condensed-latin-600-normal.woff2", "fonts/barlow-condensed-latin-700-normal.woff2",
  "fonts/barlow-condensed-latin-800-normal.woff2", "fonts/barlow-condensed-latin-800-italic.woff2",
  "fonts/source-sans-3-latin-400-normal.woff2", "fonts/source-sans-3-latin-600-normal.woff2",
  "fonts/source-sans-3-latin-700-normal.woff2", "fonts/noto-kufi-arabic-arabic-700-normal.woff2"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION + "-shell").then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live data: always try the network, fall back to the last saved copy.
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION + "-data").then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || new Response(JSON.stringify({ error: "offline" }), { status: 503, headers: { "content-type": "application/json" } }))));
    return;
  }

  // Team crests and league logos: cache after first view.
  if (/api-sports\.io$/.test(url.hostname)) {
    e.respondWith(caches.open(VERSION + "-img").then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const res = await fetch(req, { mode: "no-cors" }).catch(() => null);
      if (res) await c.put(req, res.clone()).catch(() => {});
      return res || Response.error();
    }));
    return;
  }

  // App shell: cached first, refreshed in the background.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: url.pathname === "/" }).then(hit => {
      const net = fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION + "-shell").then(c => c.put(req, copy)); } return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
