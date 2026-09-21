// 방문한 페이지를 캐시해서 오프라인에서도 다시 열리게 해주는 기본 서비스워커.
// Supabase(인증/DB/Edge Function), 토스페이먼츠, 뉴스/공시 외부 사이트는 절대 건드리지 않음 —
// 이 캐시 로직은 이 사이트(같은 출처)의 GET 요청에만 적용됨.

const CACHE_NAME = "goods-shop-cache-v1";
const APP_SHELL = ["style.css", "supabase-client.js", "nav.js", "pwa.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 출처의 GET 요청만 캐싱 대상으로 함. Supabase/토스/외부 뉴스·공시 사이트 등
  // 다른 출처 요청이나 POST 같은 비GET 요청은 서비스워커가 아예 손대지 않고 그대로 네트워크로 보냄.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("index.html")))
  );
});
