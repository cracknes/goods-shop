// 네이버/카카오 간편인증 버튼. login.html, signup.html 공용.
// 참고: 소셜 로그인은 "로그인"과 "회원가입"이 같은 동작임 — 처음 누르면 자동으로 계정이 만들어지고,
// 다음부터는 같은 버튼이 로그인 역할을 함.
function renderSocialButtons(containerId) {
  const el = document.getElementById(containerId);
  el.innerHTML = `
    <button type="button" class="btn-kakao" id="kakao-btn">카카오로 시작하기</button>
    <button type="button" class="btn-naver" id="naver-btn">네이버로 시작하기</button>
  `;

  const redirectTo = new URL("index.html", location.href).href;

  document.getElementById("kakao-btn").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "kakao", options: { redirectTo } });
    if (error) alert("카카오 로그인 실패: " + error.message);
  });

  document.getElementById("naver-btn").addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: "custom:naver", options: { redirectTo } });
    if (error) alert("네이버 로그인 실패: " + error.message);
  });
}
