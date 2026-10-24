// 모바일 앱처럼 화면 아래 고정되는 공통 하단 탭바. 홈/날씨/문의/마이 4개 — 이 사이트에 실제로
// 있는 페이지로만 연결함(장바구니 기능 자체가 없어서 그 탭은 빼고 "문의하기"로 대체).
// "날씨"는 네이버 날씨 페이지로 바로 연결(외부 사이트라 새 탭으로 염).
// "마이" 탭은 로그인 전엔 로그인 페이지로, 로그인 후엔 내 정보 수정 페이지(profile.html)로 이동.
//
// 로그인 여부는 supabaseClient.auth.getUser()로 비동기로 확인해야 해서, 페이지를 넘어갈 때마다
// 그 응답을 기다리는 짧은 순간 동안 탭바 내용이 비어있었음 — 내용 없이 padding/그림자만 있는
// 빈 알약 모양이 잠깐 보였다가 채워지면서 "바닥 흰 부분만 잔상처럼 남는" 것처럼 보이는 문제가
// 있었음(실제로 겪은 문제). 로그인 여부와 무관한 3개 탭 + "마이" 탭의 기본 모습(로그인 전 상태)을
// 먼저 동기적으로 바로 그려서 빈 상태가 생기지 않게 하고, 로그인 상태 확인이 끝나면 "마이" 탭
// 하나만 필요하면 바꿔치기함.
function renderBottomNavSkeleton() {
  const el = document.getElementById("bottom-nav");
  if (!el) return null;
  document.body.classList.add("has-bottom-nav");

  const path = location.pathname.split("/").pop() || "index.html";
  const isActive = (name) => (path === name ? "active" : "");

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
    <a href="login.html" id="bottom-nav-my" class="${isActive("login.html")}">
      <span class="bottom-nav-icon">🔑</span>로그인
    </a>
  `;
  return el;
}

async function renderBottomNav() {
  const el = renderBottomNavSkeleton();
  if (!el) return;

  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return; // 로그인 전 기본 모습(로그인 탭)이 이미 맞으므로 더 손댈 게 없음

  const myLink = document.getElementById("bottom-nav-my");
  if (!myLink) return;
  const path = location.pathname.split("/").pop() || "index.html";
  // 마이페이지(mypage.html)에서 들어가는 회원정보 수정/결제내역 화면에 있을 때도 "마이" 탭이
  // 켜져 있어야 자연스러움 — 문의내역(contact.html)은 "문의" 탭과 겹쳐서 거긴 제외함.
  const myPages = ["mypage.html", "profile.html", "orders.html"];
  myLink.href = "mypage.html";
  myLink.className = myPages.includes(path) ? "active" : "";
  myLink.innerHTML = `<span class="bottom-nav-icon">👤</span>마이`;
}
renderBottomNav();
