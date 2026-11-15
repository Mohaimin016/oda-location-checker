const CACHE_NAME = "oda-location-checker-v17";
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
  // If the network is slow or flaky, stop waiting after 3 seconds and open the saved copy.
  if (event.request.mode === "navigate") {
    const saved = () => caches.match(event.request, { ignoreSearch: true }).then(c => c || caches.match("./index.html"));
    const network = fetch(event.request).then(response => putInCache(event.request, response));
    const timeout = new Promise(resolve => setTimeout(resolve, 3000)).then(saved);
    event.respondWith(
      Promise.race([network.catch(saved), timeout.then(c => c || network)])
        .then(r => r || network)
        .catch(saved)
    );
    return;
  }

  // Icons, manifest, etc.: saved copy first, network as backup.
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => putInCache(event.request, response)))
  );
});
