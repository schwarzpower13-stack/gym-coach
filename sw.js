const CACHE = 'coach-v6';
const SHELL = ['./', 'index.html', 'app.js', 'data.js', 'discipline.js', 'words.js', 'foodlog.js', 'spirit.js', 'learn.js', 'migrate.js', 'ui.js', 'today.js', 'freq.js', 'manifest.webmanifest', 'img/icons/icon-180.png', 'img/icons/icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const local = u.origin === location.origin;
  const thumb = u.hostname === 'i.ytimg.com';
  if (!local && !thumb) return;
  // app code: network first (fresh updates), images: cache first
  const isImg = thumb || u.pathname.includes('/img/');
  e.respondWith(isImg
    ? caches.match(e.request).then(r => r || fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return res; }))
    : fetch(e.request).then(res => { const c = res.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return res; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
