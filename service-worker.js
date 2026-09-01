const CACHE_NAME = "jimble-v1.2";

const APP_FILES = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./data/cards.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];


/*
 * Install the application shell and initial card deck.
 */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});


/*
 * Remove old caches when a new service worker takes over.
 */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});


/*
 * Handle network requests.
 */
self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);


  /*
   * For cards.json prefer the newest online copy,
   * but fall back to the cached deck when offline.
   */
  if (requestUrl.pathname.endsWith("/data/cards.json")) {

    event.respondWith(
      fetch(event.request)
        .then(response => {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, copy));

          return response;
        })
        .catch(() => caches.match(event.request))
    );

    return;
  }


  /*
   * For the application itself use the cached version
   * first, with the network as fallback.
   */
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse =>
        cachedResponse || fetch(event.request)
      )
  );

});
