// 모바일 앱처럼 화면 아래 고정되는 공통 하단 탭바. 홈/상품/문의/마이 4개 — 이 사이트에 실제로
// 있는 페이지로만 연결함(장바구니 기능 자체가 없어서 그 탭은 빼고 "문의하기"로 대체).
// "마이" 탭은 로그인 전엔 로그인 페이지로, 로그인 후엔 결제내역(가장 "내 정보"에 가까운 페이지)으로 이동.
async function renderBottomNav() {
  const el = document.getElementById("bottom-nav");
  if (!el) return;
  document.body.classList.add("has-bottom-nav");

  const { data: { user } } = await supabaseClient.auth.getUser();
  const path = location.pathname.split("/").pop() || "index.html";
  const isActive = (name) => (path === name ? "active" : "");

  const myHref = user ? "orders.html" : "login.html";
  const myLabel = user ? "마이" : "로그인";
  const myIcon = user ? "👤" : "🔑";
  const myActive = user ? isActive("orders.html") : isActive("login.html");

  el.innerHTML = `
    <a href="index.html" class="${isActive("index.html")}">
      <span class="bottom-nav-icon">🏠</span>홈
    </a>
    <a href="index.html#products" class="${isActive("index.html") && location.hash === "#products" ? "active" : ""}">
      <span class="bottom-nav-icon">🛍️</span>상품
    </a>
    <a href="contact.html" class="${isActive("contact.html")}">
      <span class="bottom-nav-icon">💬</span>문의
    </a>
    <a href="${myHref}" class="${myActive}">
      <span class="bottom-nav-icon">${myIcon}</span>${myLabel}
    </a>
  `;
}
renderBottomNav();
// index.html 안에서 "상품" 탭을 누르면 페이지 이동 없이 해시만 바뀌어서(#products) 다시
// 그려주지 않으면 활성 표시가 안 바뀜 — 해시가 바뀔 때마다 다시 그려서 바로 반영되게 함.
window.addEventListener("hashchange", renderBottomNav);
