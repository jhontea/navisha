const STATIC_CACHE = "navisha-static-v1"
const STATIC_PREFIX = "/_next/static/"

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("navisha-static-") && key !== STATIC_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(STATIC_PREFIX)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
    }),
  )
})
