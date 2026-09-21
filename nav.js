// 모든 페이지 공통 상단 네비게이션. 로그인 상태에 따라 보여줄 링크가 다름.
async function renderNav() {
  const nav = document.getElementById("nav");
  const { data: { user } } = await supabaseClient.auth.getUser();

  // 소셜 로그인(네이버/카카오)은 리다이렉트로 돌아온 이 시점에 처음 로그인이 확정되므로 여기서 기록
  if (user && sessionStorage.getItem("oauthLoginPending") === "1") {
    sessionStorage.removeItem("oauthLoginPending");
    await recordLogin(user);
  }

  const isAdmin = user?.email === "admin@admin.com";

  nav.innerHTML = `
    <a class="brand" href="index.html">지후네 하우스 <span class="brand-sub">이지후</span></a>
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
