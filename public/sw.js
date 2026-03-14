const STATIC_CACHE = 'pharmapro-static-v1'
const PAGE_CACHE = 'pharmapro-pages-v1'
const API_CACHE = 'pharmapro-api-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/offline',
        '/manifest.json',
        '/icons/icon-192.svg',
        '/icons/icon-512.svg',
      ])
    )
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, PAGE_CACHE, API_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request))
    return
  }

  if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(staleWhileRevalidatePage(request))
    return
  }

  if (/\.(?:js|css|svg|png|jpg|jpeg|webp|ico)$/.test(url.pathname)) {
    event.respondWith(cacheFirstStatic(request))
  }
})

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  const title = data.title || 'PharmaTech Pro'
  const body = data.body || 'You have a new update from your pharmacy.'
  const url = data.url || '/dashboard'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/dashboard'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client && client.url.includes(targetUrl)) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl)
      }
    })
  )
})

async function cacheFirstStatic(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  const cache = await caches.open(STATIC_CACHE)
  cache.put(request, response.clone())
  return response
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached || new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function staleWhileRevalidatePage(request) {
  const cache = await caches.open(PAGE_CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone())
      return response
    })
    .catch(() => null)

  return cached || networkPromise || caches.match(OFFLINE_URL)
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await cache.match(request)
    return cached || caches.match(OFFLINE_URL)
  }
}
