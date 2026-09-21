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
