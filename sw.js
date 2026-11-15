const CACHE_NAME = "oda-location-checker-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
  }
  return response;
};

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  // The page itself: try the network first so updates show up right away,
  // fall back to the saved copy when offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(response => putInCache(event.request, response))
        .catch(() => caches.match(event.request).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  // Icons, manifest, etc.: saved copy first, network as backup.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => putInCache(event.request, response)))
  );
});
