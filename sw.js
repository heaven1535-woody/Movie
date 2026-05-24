// Pensieve Service Worker
const CACHE_NAME = 'pensieve-v1';

// Install: 활성화 즉시 시작
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activate: 이전 캐시 정리
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: 리소스별 전략
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);
  
  // TMDB API: 네트워크만 (캐시 안 함, 항상 최신 데이터)
  if (url.hostname === 'api.themoviedb.org') {
    return; // 기본 동작 - 그대로 통과
  }
  
  // 포스터 이미지 & 폰트: 캐시 우선
  if (
    url.hostname === 'image.tmdb.org' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(resp => {
          if (resp && resp.status === 200 && resp.type !== 'opaque') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
          }
          return resp;
        }).catch(() => cached)
      )
    );
    return;
  }
  
  // HTML 및 기타: 네트워크 우선 (실패 시 캐시)
  e.respondWith(
    fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return resp;
    }).catch(() => caches.match(e.request))
  );
});
