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
