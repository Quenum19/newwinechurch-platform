/**
 * Service Worker minimaliste NWC.
 *
 * Stratégies :
 *  - Pages HTML : network-first → fallback cache (offline-friendly)
 *  - Static assets (JS/CSS/images) : cache-first
 *  - API calls : pas de cache (toujours réseau)
 *
 * Évite vite-plugin-pwa (incompatible Vite 8) — implémentation manuelle.
 */

const CACHE_VERSION = 'nwc-v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const PAGES_CACHE  = `pages-${CACHE_VERSION}`

// Pré-cache des assets critiques au moment de l'install.
const PRECACHE_URLS = [
  '/',
  '/logos/logo_newwine.png',
  '/logos/logo_md.png',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ! k.endsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorer les requêtes non-GET et non-http (chrome-extension etc.)
  if (request.method !== 'GET') return
  if (! url.protocol.startsWith('http')) return

  // 1. API : toujours réseau (pas de cache).
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/sanctum/')) {
    return // laisse le browser gérer
  }

  // 2. Pages HTML : network-first avec fallback cache.
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(PAGES_CACHE).then((c) => c.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // 3. Static assets (JS/CSS/images/fonts) : cache-first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((res) => {
        if (res.ok && (url.origin === self.location.origin)) {
          const copy = res.clone()
          caches.open(STATIC_CACHE).then((c) => c.put(request, copy))
        }
        return res
      })
    })
  )
})
