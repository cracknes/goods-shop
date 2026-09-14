// 모든 페이지 공통 상단 네비게이션. 로그인 상태에 따라 보여줄 링크가 다름.
async function renderNav() {
  const nav = document.getElementById("nav");
  const { data: { user } } = await supabaseClient.auth.getUser();

  const isAdmin = user?.email === "admin@admin.com";

  nav.innerHTML = `
    <a class="brand" href="index.html">노르덴돌프</a>
    <div class="nav-links">
      <a href="index.html">상품</a>
      ${isAdmin ? "" : `<a href="contact.html" class="nav-cta">문의하기</a>`}
      ${user && !isAdmin ? `<a href="orders.html">내 결제내역</a>` : ""}
      ${isAdmin ? `<a href="admin.html">관리자</a>` : ""}
      ${user ? `<button id="logout-btn">로그아웃(${user.email})</button>` : `<a href="login.html">로그인</a>`}
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
