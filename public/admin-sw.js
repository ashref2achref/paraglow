/* ParaGlow Admin — Service Worker minimal.
 * Restreint au scope /admin. Objectif : installabilité de l'app admin +
 * cache basique des assets statiques (icônes). Pas de mode offline complet :
 * les pages et requêtes API passent par le réseau normalement. */

const CACHE = 'paraglow-admin-static-v1'
const PRECACHE = [
  '/admin-manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

// Cache-first uniquement pour les icônes statiques. Tout le reste (pages admin,
// API) n'est pas intercepté et suit le comportement réseau natif.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
            return response
          })
      )
    )
  }
})
