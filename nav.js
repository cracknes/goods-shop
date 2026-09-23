// 브라우저 뒤로가기/앞으로가기로 페이지가 bfcache(뒤로가기 캐시)에서 복원되면,
// 스크립트를 다시 실행하지 않고 그 당시 화면(DOM)을 그대로 얼려서 보여줌 — 그 사이에
// 로그아웃하고 다른 계정으로 로그인했어도 뒤로가기 하면 예전 로그인 상태(예: 관리자)가
// 그대로 보이는 문제가 생김. pageshow 이벤트의 persisted 값으로 bfcache 복원을 감지해서
// 페이지를 새로고침하면, 실제 로그인 상태를 다시 정확히 불러오게 됨.
window.addEventListener("pageshow", (event) => {
  if (event.persisted) location.reload();
});

// 로그인한 사용자가 5분 동안 아무 동작(마우스/키보드/터치/스크롤)도 안 하면 자동 로그아웃
const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let idleTimer = null;

function setupIdleLogout() {
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(async () => {
      await supabaseClient.auth.signOut();
      alert("5분 동안 활동이 없어 자동으로 로그아웃되었습니다.");
      location.href = "login.html";
    }, IDLE_TIMEOUT_MS);
  };
  ["mousemove", "keydown", "click", "scroll", "touchstart"].forEach(evt => {
    document.addEventListener(evt, resetIdleTimer);
  });
  resetIdleTimer();
}

// 모든 페이지 공통 상단 네비게이션. 로그인 상태에 따라 보여줄 링크가 다름.
async function renderNav() {
  const nav = document.getElementById("nav");
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (user) setupIdleLogout();
  if (user && typeof touchPushLastLogin === "function") touchPushLastLogin(user);

  // 소셜 로그인(네이버/카카오)은 리다이렉트로 돌아온 이 시점에 처음 로그인이 확정되므로 여기서 기록
  if (user && sessionStorage.getItem("oauthLoginPending") === "1") {
    sessionStorage.removeItem("oauthLoginPending");
    await recordLogin(user);
  }

  const isAdmin = user?.email === "admin@admin.com";

  nav.innerHTML = `
    <a class="brand" href="index.html">JiHoo's House</a>
    <div class="nav-links">
      ${user && !isAdmin ? `<a href="contact.html">문의하기</a>` : ""}
      ${user && !isAdmin ? `<a href="orders.html">결제내역</a>` : ""}
      ${isAdmin ? `<a href="admin.html">관리자</a>` : ""}
      ${user ? `<button id="logout-btn">로그아웃(${escapeHtml(user.email)})</button>` : `<a href="login.html">로그인</a>`}
    </div>
  `;

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      location.href = "index.html";
    });
  }
}
renderNav();
