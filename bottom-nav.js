// 모바일 앱처럼 화면 아래 고정되는 공통 하단 탭바. 로그인한 사용자에게만 보여줌(비로그인 상태는
// 완전히 숨김 — 로그인은 상단 nav의 "로그인" 링크로 가능). 홈/날씨/문의/마이 4개 — 이 사이트에
// 실제로 있는 페이지로만 연결함(장바구니 기능 자체가 없어서 그 탭은 빼고 "문의하기"로 대체).
// "날씨"는 네이버 날씨 페이지로 바로 연결(외부 사이트라 새 탭으로 염).
async function renderBottomNav() {
  const el = document.getElementById("bottom-nav");
  if (!el) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) {
    // .bottom-nav가 display:flex를 항상 걸고 있어서(author 스타일시트가 UA의 [hidden]{display:none}
    // 규칙보다 우선 적용됨), hidden 속성만으로는 안 숨겨짐 — style.css에 .bottom-nav[hidden] 전용
    // 규칙을 따로 추가해둠.
    el.hidden = true;
    document.body.classList.remove("has-bottom-nav");
    return;
  }

  el.hidden = false;
  document.body.classList.add("has-bottom-nav");

  const path = location.pathname.split("/").pop() || "index.html";
  const isActive = (name) => (path === name ? "active" : "");
  // 마이페이지(mypage.html)에서 들어가는 회원정보 수정/결제내역 화면에 있을 때도 "마이" 탭이
  // 켜져 있어야 자연스러움 — 문의내역(contact.html)은 "문의" 탭과 겹쳐서 거긴 제외함.
  const myPages = ["mypage.html", "profile.html", "orders.html"];

  el.innerHTML = `
    <a href="index.html" class="${isActive("index.html")}">
      <span class="bottom-nav-icon">🏠</span>홈
    </a>
    <a href="https://weather.naver.com/today/09740690" target="_blank" rel="noopener noreferrer">
      <span class="bottom-nav-icon">🌤️</span>날씨
    </a>
    <a href="contact.html" class="${isActive("contact.html")}">
      <span class="bottom-nav-icon">💬</span>문의
    </a>
    <a href="mypage.html" class="${myPages.includes(path) ? "active" : ""}">
      <span class="bottom-nav-icon">👤</span>마이
    </a>
  `;
}
// 스크롤 중에는 하단바를 숨기고, 맨 위/맨 아래에 도달했을 때만 다시 보여줌(콘텐츠를 덜 가리게).
function updateBottomNavScrollVisibility() {
  const el = document.getElementById("bottom-nav");
  if (!el || el.hidden) return;
  const atTop = window.scrollY <= 10;
  const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 10;
  el.classList.toggle("bottom-nav-hide", !(atTop || atBottom));
}
window.addEventListener("scroll", updateBottomNavScrollVisibility, { passive: true });
renderBottomNav().then(updateBottomNavScrollVisibility);
