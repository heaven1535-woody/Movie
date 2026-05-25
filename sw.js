// PENSIEVE Service Worker v3.0.1
const VERSION = 'v3.0.1';
const CACHE_NAME = 'pensieve-' + VERSION;
const ASSETS = [
  './pensieve.html',
  './app.js',
  './app-main.js',
  './movies-data.js',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg',
  './apple-touch-icon.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('pensieve-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // TMDB API: 캐시 안 함 (항상 최신)
  if (url.hostname === 'api.themoviedb.org') return;

  // 포스터, 폰트: 캐시 우선 (오프라인 지원)
  if (url.hostname === 'image.tmdb.org' || url.hostname.includes('fonts.g')) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(resp => {
          if (resp && resp.status === 200) {
            const c = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)).catch(() => {});
          }
          return resp;
        }).catch(() => cached)
      )
    );
    return;
  }

  // 앱 자산: 네트워크 우선 (업데이트 즉시 반영), 실패 시 캐시
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const c = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, c)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
