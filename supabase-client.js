// 공개해도 안전한 값들 (URL, publishable key). 비밀키는 여기 없음.
const SUPABASE_URL = "https://tnvpedaymwozpinujmfk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_if4i-5B0dSggVrxruBBrLw_ARQUvexF";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 브라우저 User-Agent에서 대략적인 기기 정보를 뽑아냄.
// 웹페이지는 보안상 MAC 주소 등 하드웨어 고유 식별자는 절대 읽을 수 없어서, 여기서는
// User-Agent에 있는 OS/기종/브라우저 정보만 사용함(안드로이드는 보통 정확한 모델명이 담겨있지만,
// 아이폰은 iOS 정책상 "iPhone"까지만 알 수 있고 구체적인 모델명(예: iPhone 15)은 알 수 없음).
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let model = "알 수 없는 기기";

  if (/iPad/.test(ua)) {
    model = "iPad";
  } else if (/iPhone/.test(ua)) {
    model = "iPhone";
  } else if (/Android/.test(ua)) {
    const m = ua.match(/Android [^;]+;\s*([^;)]+)/);
    model = m ? m[1].trim() : "Android 기기";
  } else if (/Windows/.test(ua)) {
    model = "Windows PC";
  } else if (/Macintosh/.test(ua)) {
    model = "Mac";
  } else if (/Linux/.test(ua)) {
    model = "Linux PC";
  }

  let browser = "알 수 없는 브라우저";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua)) browser = "Opera";
  else if (/SamsungBrowser\//.test(ua)) browser = "Samsung Internet";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";

  return `${model} · ${browser}`;
}

// 로그인 이력 기록 (비밀번호 로그인, 회원가입 시, 소셜 로그인 콜백에서 공용으로 호출)
async function recordLogin(user) {
  if (!user) return;
  await supabaseClient.from("login_events").insert({
    user_id: user.id,
    email: user.email,
    device_info: getDeviceInfo(),
  });
  // 같은 브라우저 세션(탭을 안 닫고 있는 동안)에서는 페이지를 이동하거나 새로고침해도 또
  // 기록되지 않게 표시해둠 — "자동로그인" 세션 복원 시(nav.js) 이 표시를 보고 중복 기록을 막음.
  try { sessionStorage.setItem("loginRecordedThisSession", "1"); } catch (_) {}
}

// 날짜/시각 표시는 브라우저 로케일에 의존하는 toLocaleString() 대신
// 한국식 "년/월/일" 형식으로 고정해서 보여줌 (예: 2026/09/27, 2026/09/27 10:11).
// YYYYMMDD 형태의 8자리 문자열(공공데이터포털/DART API 응답에서 자주 나오는 날짜 형식)도 그대로 받아들임.
function formatKDate(input) {
  const d = typeof input === "string" && /^\d{8}$/.test(input)
    ? new Date(`${input.slice(0, 4)}-${input.slice(4, 6)}-${input.slice(6, 8)}`)
    : new Date(input);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function formatKDateTime(input) {
  const d = new Date(input);
  const pad = (n) => String(n).padStart(2, "0");
  return `${formatKDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// DB에서 불러온 값(상품명, 문의 내용, 이메일 등)을 innerHTML로 화면에 그릴 때
// <script> 같은 태그가 실행되지 않도록 특수문자를 이스케이프 (저장형 XSS 방지)
function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
