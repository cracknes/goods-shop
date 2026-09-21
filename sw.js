// 방문한 페이지를 캐시해서 오프라인에서도 다시 열리게 해주는 서비스워커.
// Supabase(인증/DB/Edge Function), 토스페이먼츠, 뉴스/공시 외부 사이트는 절대 건드리지 않음 —
// 이 캐시 로직은 이 사이트(같은 출처)의 GET 요청에만 적용됨.

const CACHE_NAME = "goods-shop-cache-v2";

// 자주 보는 페이지 + 공용 자산은 설치 시점에 미리 캐시해둠 (오프라인에서도 바로 열리도록)
const PRECACHE_URLS = [
  "index.html",
  "login.html",
  "signup.html",
  "contact.html",
  "orders.html",
  "offline.html",
  "style.css",
  "supabase-client.js",
  "nav.js",
  "pwa.js",
  "manifest.json",
];

// 결제 진행 중(토스 리다이렉트 대상) 페이지는 캐시를 아예 쓰지 않고 항상 네트워크에서 최신 상태로 받아옴 —
// 결제 승인 로직이 든 페이지라 캐시된 옛 버전이 뜨면 안 되기 때문.
const NETWORK_ONLY_PATHS = ["success.html", "fail.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
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

  if (NETWORK_ONLY_PATHS.some((p) => url.pathname.endsWith(p))) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") return caches.match("offline.html");
        return Response.error();
      })
  );
});

// 푸시 알림 수신 시 화면에 표시
self.addEventListener("push", (event) => {
  let data = { title: "지후네 하우스", body: "새 알림이 있어요." };
  try {
    if (event.data) data = event.data.json();
  } catch (_) { /* 텍스트가 JSON이 아니면 기본 문구 사용 */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("index.html"));
});
