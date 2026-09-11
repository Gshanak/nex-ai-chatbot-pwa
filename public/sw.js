const CACHE = 'nex-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/images/creative.jpg', '/images/interior.jpg', '/images/travel.jpg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || request.headers.get('RSC') === '1') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => { if(response.ok) { const clone = response.clone(); caches.open(CACHE).then(cache => cache.put('/', clone)); } return response; }).catch(() => caches.match('/')));
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/images/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => { if(response.ok) { const clone = response.clone(); caches.open(CACHE).then(cache => cache.put(request, clone)); } return response; })));
  }
});
