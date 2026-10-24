// 모바일 앱처럼 화면 아래 고정되는 공통 하단 탭바. 홈/상품/문의/마이 4개 — 이 사이트에 실제로
// 있는 페이지로만 연결함(장바구니 기능 자체가 없어서 그 탭은 빼고 "문의하기"로 대체).
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
  // index.html은 "홈"과 "상품"이 같은 페이지(해시로만 구분)라, 홈 쪽도 해시가 #products일 땐
  // 꺼줘야 함 — 안 그러면 상품 탭을 눌러도 홈이 계속 같이 켜져 있는 것처럼 보였음.
  const onProducts = path === "index.html" && location.hash === "#products";

  el.innerHTML = `
    <a href="index.html" class="${isActive("index.html") && !onProducts ? "active" : ""}">
      <span class="bottom-nav-icon">🏠</span>홈
    </a>
    <a href="index.html#products" class="${onProducts ? "active" : ""}">
      <span class="bottom-nav-icon">🛍️</span>상품
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
// index.html 안에서 "상품" 탭을 누르면 페이지 이동 없이 해시만 바뀌어서(#products) 다시
// 그려주지 않으면 활성 표시가 안 바뀜 — 해시가 바뀔 때마다 다시 그려서 바로 반영되게 함.
window.addEventListener("hashchange", renderBottomNav);
