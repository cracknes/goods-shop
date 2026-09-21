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

// 알림을 아직 허용 안 했으면 동의를 구하고 구독까지 하고, 이미 구독돼 있으면 기존 구독을 그대로 반환
async function subscribeToPush() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub) return sub;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  try {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const subJson = sub.toJSON();
    await supabaseClient.from("push_subscriptions").insert({
      user_id: user ? user.id : null,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys.p256dh,
      auth: subJson.keys.auth,
    });
  } catch (_) { /* 구독 저장이 실패해도 지금 이 브라우저로 테스트 알림 받는 데는 지장 없음 */ }

  return sub;
}

// 동의를 구하고(아직 안 했다면) 방금 구독한 이 브라우저로 테스트 알림을 하나 보냄
async function sendTestPush() {
  const sub = await subscribeToPush();
  if (!sub) throw new Error("알림 권한이 거부되었습니다.");

  const { error } = await supabaseClient.functions.invoke("send-push", {
    body: { subscription: sub.toJSON(), title: "지후네 하우스", body: "테스트 알림이에요! 🎉" },
  });
  if (error) throw error;
}
