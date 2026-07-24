/**
 * Service Worker NWC v2 — défensif pour ne pas casser l'admin.
 *
 * Stratégies :
 *  - SKIP /admin/* (gestion via React Router pur, pas d'interception)
 *  - SKIP requêtes cross-origin (api.newinechurch.org est géré par axios)
 *  - SKIP non-GET (POST/PUT/DELETE : passe direct au browser)
 *  - Pages publiques HTML : network-first → fallback cache
 *  - Static assets (JS/CSS/images) : cache-first
 *
 * Évite vite-plugin-pwa (incompatible Vite 8) — implémentation manuelle.
 */

// BUMP à chaque refonte importante pour forcer la purge côté client (SW cache-first).
// Sinon les visiteurs voient l'ancien bundle malgré un nouveau deploy.
const CACHE_VERSION = 'nwc-v3-2026-07-24'
const STATIC_CACHE  = `static-${CACHE_VERSION}`
const PAGES_CACHE   = `pages-${CACHE_VERSION}`

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
      .catch(() => {}) // silently OK si certains assets manquent
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Purge TOUS les anciens caches (v1, v2 précédents) — bump CACHE_VERSION pour forcer.
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

  // 1. Ignorer tout sauf GET (les POST/PUT/DELETE des forms admin doivent passer
  //    directement au browser sans interception).
  if (request.method !== 'GET') return

  // 2. Ignorer les schémes non-http (chrome-extension, data:, etc.)
  if (! url.protocol.startsWith('http')) return

  // 3. Ignorer cross-origin (api.newinechurch.org, fonts, etc.) — laisse axios/browser gérer.
  if (url.origin !== self.location.origin) return

  // 4. Ignorer l'admin ENTIÈREMENT — fetch direct, pas de cache, pas d'interception.
  //    Permet aux fetch internes des forms (Tiptap, MediaLibrary uploads, etc.) de
  //    passer sans risque de bloquage par le SW.
  if (url.pathname.startsWith('/admin')) return
  if (url.pathname.startsWith('/mon-espace')) return
  if (url.pathname.startsWith('/gouverneur')) return
  if (url.pathname.startsWith('/leader')) return
  // Skip /live/* : l'écran live du bal DOIT toujours servir le dernier code
  // (sinon les corrections de slides ne s'appliquent jamais sans vider le cache).
  if (url.pathname.startsWith('/live')) return

  // 5. Ignorer les routes API / sanctum si quelqu'un tape via le racine.
  if (url.pathname.startsWith('/api/'))     return
  if (url.pathname.startsWith('/sanctum/')) return
  if (url.pathname.startsWith('/storage/')) return

  // 6. Pages HTML publiques : network-first avec fallback cache (offline-friendly).
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Ne cache que les réponses 2xx
          if (res.ok) {
            const copy = res.clone()
            caches.open(PAGES_CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // 7. Static assets (JS/CSS/images/fonts) : cache-first avec fallback réseau.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((c) => c.put(request, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => cached || new Response('', { status: 504, statusText: 'Offline' }))
    })
  )
})
