// 공개해도 안전한 값들 (URL, publishable key). 비밀키는 여기 없음.
const SUPABASE_URL = "https://tnvpedaymwozpinujmfk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_if4i-5B0dSggVrxruBBrLw_ARQUvexF";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// 로그인 이력 기록 (비밀번호 로그인, 회원가입 시, 소셜 로그인 콜백에서 공용으로 호출)
async function recordLogin(user) {
  if (!user) return;
  await supabaseClient.from("login_events").insert({ user_id: user.id, email: user.email });
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
