// Service worker minimal : rend l'appli installable et garde la coquille disponible hors ligne.
const CACHE = 'memoire-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './icon-192.png'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  // Navigation : réseau d'abord, coquille en cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./')))
  }
})
