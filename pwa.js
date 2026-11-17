// PWA 공통 스크립트: 서비스워커 등록 + 모바일 첫 방문 시 "홈 화면에 추가" 안내 배너.
// 모든 페이지에서 nav.js와 함께 로드됨.

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

(function setupInstallBanner() {
  const DISMISSED_KEY = "pwaInstallBannerDismissed";
  const isMobile = window.matchMedia("(max-width: 640px)").matches;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  let dismissed = false;
  try {
    dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
  } catch (_) { /* 프라이빗 모드 등에서 localStorage가 막혀있으면 그냥 매번 안 띄움 */ }

  if (!isMobile || isStandalone || dismissed) return;

  function showBanner(message, showInstallButton, onInstallClick) {
    const banner = document.createElement("div");
    banner.className = "pwa-install-banner";
    banner.innerHTML = `
      <span>${message}</span>
      <div class="pwa-install-banner-actions">
        ${showInstallButton ? `<button type="button" id="pwa-install-btn">설치</button>` : ""}
        <button type="button" id="pwa-install-close" aria-label="닫기">&times;</button>
      </div>
    `;
    document.body.appendChild(banner);

    function dismiss() {
      banner.remove();
      try { localStorage.setItem(DISMISSED_KEY, "1"); } catch (_) {}
    }

    document.getElementById("pwa-install-close").addEventListener("click", dismiss);
    if (showInstallButton) {
      document.getElementById("pwa-install-btn").addEventListener("click", async () => {
        if (onInstallClick) await onInstallClick();
        dismiss();
      });
    }
  }

  if (isIOS) {
    // iOS 사파리는 beforeinstallprompt를 지원하지 않아서, 직접 하는 방법을 안내만 함
    showBanner("Safari 하단 공유 버튼 → \"홈 화면에 추가\"를 누르면 앱처럼 설치할 수 있어요.", false);
    return;
  }

  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showBanner("홈 화면에 추가하고 앱처럼 바로 열어보세요.", true, async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  });
})();

// 푸시 알림 구독 + "테스트 알림 보내기" (index.html의 버튼이 이 함수들을 호출함)
const VAPID_PUBLIC_KEY = "BNn9V-Oxd06jBmWIgf4sUpFAPMTCkbYHsVrf4oSY9JVzCveH9I00ORyeXOajtqcCOioRPQcUqEYXpSXBJKElGIk";

function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// 알림을 아직 허용 안 했으면 동의를 구하고 구독까지 하고, 이미 구독돼 있으면 기존 구독(기기 단위)을 재사용함.
// 브라우저 알림 권한/구독은 기기·출처 단위라 계정이 바뀌어도 다시 물어볼 필요는 없지만,
// DB에는 "이 계정도 이 기기에서 받기로 했다"는 행을 계정별로 따로 저장해서 아이디별로 구분함.
async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  // 사용자가 "알림 받기"를 직접 누른 것이므로 기존 구독을 재사용하지 않고 항상 새로 만듦 —
  // 브라우저가 들고 있는 기존 구독이 푸시 서버 쪽에선 이미 만료(410)된 경우가 있는데(실제로 발생),
  // 그걸 재사용하면 다시 저장해도 계속 실패함. 해지 후 새로 구독하면 살아있는 새 주소를 받음.
  const oldSub = await reg.pushManager.getSubscription();
  if (oldSub) await oldSub.unsubscribe();

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const subJson = sub.toJSON();
    // 방금 해지한 예전 구독의 DB 행은 새 구독 주소로 바꿔치기함 — 안 그러면 다시 설정할 때마다
    // 죽은 행이 하나씩 쌓여서, 한 계정에 보내도 "성공 1, 실패 N(410)"이 나왔음(실제로 발생).
    // (클라이언트는 DB 행 삭제 권한이 없고 자기 행 수정 권한만 있어서 update로 처리)
    if (user && oldSub) {
      await supabaseClient
        .from("push_subscriptions")
        .update({ endpoint: subJson.endpoint, p256dh: subJson.keys.p256dh, auth: subJson.keys.auth })
        .eq("endpoint", oldSub.endpoint)
        .eq("user_id", user.id);
    }
    await supabaseClient.from("push_subscriptions").upsert({
      user_id: user ? user.id : null,
      email: user ? user.email : null,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
      last_login_at: new Date().toISOString(),
    }, { onConflict: "endpoint,user_id" });
  } catch (_) { /* 구독 저장이 실패해도 지금 이 브라우저로 알림 받는 데는 지장 없음 */ }

  return sub;
}

// 로그인한 계정이 이 기기에서 이미 알림을 구독 중이면, "이 계정이 이 기기에서 최근에 활동했다"는
// 시각을 갱신함. 관리자 "전체 발송" 시 한 기기에 여러 계정이 로그인돼 있어도 최종 로그인 계정에게만
// 보내 중복 알림을 막는 데 씀 (매 페이지 로드마다 nav.js에서 호출).
async function touchPushLastLogin(user) {
  if (!user || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    // 일부러 insert(upsert) 하지 않고 기존 행만 갱신함 — 서버가 만료(410)로 지운 구독을 여기서
    // 다시 넣어버리면 죽은 구독이 계속 되살아남. 행이 없으면 메인화면 "알림 받기" 카드가 다시 떠서
    // 사용자가 새로 구독하게 됨(index.html 참고).
    await supabaseClient
      .from("push_subscriptions")
      .update({ last_login_at: new Date().toISOString() })
      .eq("endpoint", sub.endpoint)
      .eq("user_id", user.id);
  } catch (_) { /* 실패해도 다음 발송 때 이전 로그인 시각으로 처리될 뿐, 기능에는 지장 없음 */ }
}
