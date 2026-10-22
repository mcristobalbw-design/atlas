// Atlas - offline worker (v2).
// The page and the manifest are fetched fresh whenever there is signal, so updates show on the next open;
// the saved copy is used only when offline. Icons are cached. Uploads (POST) are never touched.
const CACHE = 'atlas-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './atlas-192.png', './atlas-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const own = u.origin === location.origin;
  if (!own) return;                                                                 // uploads, map lookups: straight to network
  const fresh = e.request.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html') || u.pathname.endsWith('manifest.webmanifest');
  if (fresh) {                                                                      // network first, cache fallback
    e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { if (r && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => {                               // icons: cache first, refresh behind
    const net = fetch(e.request).then(r => { if (r && r.status === 200) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
