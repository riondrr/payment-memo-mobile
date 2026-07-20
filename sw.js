const cacheName = "payment-notes-v23";
const assets = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(name => name !== cacheName).map(name => caches.delete(name)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/app-config.js")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then(async response => {
          if (response.ok) {
            await caches
              .open(cacheName)
              .then(cache => cache.put(event.request, response.clone()))
              .catch(() => {});
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(cacheName);
          return (
            (await cache.match(event.request)) ||
            (await cache.match("./index.html")) ||
            cache.match("./")
          );
        })
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
