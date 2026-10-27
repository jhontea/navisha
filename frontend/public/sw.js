// Static chunks keep one cache across deploys: saved trip pages still point at
// the chunks of the build they came from, so those must outlive the deploy.
const STATIC_CACHE = "navisha-static-v1"
const STATIC_PREFIX = "/_next/static/"
const STATIC_MAX_ENTRIES = 400
// Bump when the saved-page format changes; activate drops older page caches.
// Logout and session expiry delete it from the page (lib/queryPersistence.ts).
const PAGES_CACHE = "navisha-pages-v1"
// Its own cache: logout clears saved pages, but the fallback must stay.
const OFFLINE_CACHE = "navisha-offline-v1"
const OFFLINE_URL = "/offline.html"
// /trips, /trips/:id and its bookings/budget/summary tabs (the itinerary is /trips/:id).
const OFFLINE_PAGE = /^\/trips(?:\/(?!new$|generate$)[^/]+(?:\/(?:bookings|budget|summary))?)?\/?$/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      // Without the fallback the worker is still worth installing.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

// Drops the oldest chunks past the cap, but never one a saved page still loads.
async function pruneStatic() {
  const cache = await caches.open(STATIC_CACHE)
  const keys = await cache.keys()
  if (keys.length <= STATIC_MAX_ENTRIES) return

  const pages = await caches.open(PAGES_CACHE)
  const html = await Promise.all((await pages.keys()).map((key) => pages.match(key).then((r) => r.text())))
  const used = new Set(html.flatMap((text) => text.match(/\/_next\/static\/[^"'\s\\)]+/g) ?? []))
  // keys() lists in insertion order, so the oldest chunks come first.
  const stale = keys.filter((key) => !used.has(new URL(key.url).pathname))
  await Promise.all(stale.slice(0, keys.length - STATIC_MAX_ENTRIES).map((key) => cache.delete(key)))
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("navisha-") && ![STATIC_CACHE, PAGES_CACHE, OFFLINE_CACHE].includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

async function offlineFallback() {
  return (await caches.match(OFFLINE_URL)) ?? Response.error()
}

function savePage(url, response) {
  // Never keep a redirect (e.g. to /login) or an error page.
  if (!response.ok || response.redirected || response.type !== "basic") return Promise.resolve()
  return caches.open(PAGES_CACHE).then((cache) => cache.put(url.origin + url.pathname, response))
}

async function navigate(event, url) {
  const savable = OFFLINE_PAGE.test(url.pathname)
  try {
    const response = await fetch(event.request)
    if (savable) event.waitUntil(savePage(url, response.clone()))
    return response
  } catch {
    const cached = savable
      ? await caches.match(url.origin + url.pathname, { cacheName: PAGES_CACHE, ignoreSearch: true, ignoreVary: true })
      : undefined
    return cached ?? offlineFallback()
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(navigate(event, url))
    return
  }

  // An in-app link loads only RSC data, never the page HTML. Fetch the HTML
  // alongside so a trip opened that way can also be reopened offline.
  if (request.headers.get("RSC") === "1" && !request.headers.has("Next-Router-Prefetch") && OFFLINE_PAGE.test(url.pathname)) {
    event.waitUntil(
      fetch(url.origin + url.pathname, { credentials: "same-origin" })
        .then((response) => savePage(url, response))
        .catch(() => undefined),
    )
    return
  }

  if (!url.pathname.startsWith(STATIC_PREFIX)) return

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached

      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone()
          event.waitUntil(
            caches
              .open(STATIC_CACHE)
              .then((cache) => cache.put(request, copy))
              .then(pruneStatic),
          )
        }
        return response
      })
    }),
  )
})
