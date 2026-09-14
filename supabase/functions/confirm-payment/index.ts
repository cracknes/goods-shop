// 결제 승인 Edge Function
// 1) 로그인한 사용자인지 확인 2) 토스페이먼츠에 실제 결제 승인 요청 3) 성공하면 orders 테이블에 기록
// 토스 시크릿키는 여기 코드가 아니라 `supabase secrets set TOSS_SECRET_KEY=...`로 저장되어 있음

import { createClient } from "jsr:@supabase/supabase-js@2";

const TOSS_SECRET_KEY = Deno.env.get("TOSS_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// GitHub Pages(다른 도메인)에서 브라우저로 호출하므로 CORS 헤더가 없으면
// 실제 결제 성공 후에도 브라우저가 요청 자체를 차단해버림 (curl 테스트로는 안 보임)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "POST 요청만 허용됩니다." }, 405);
  }

  // 요청을 보낸 사람이 로그인된 사용자인지 확인 (verify_jwt=true라서 여기 도달했다는 것 자체가
  // 유효한 토큰이라는 뜻이지만, 어떤 사용자인지 알기 위해 getUser()로 다시 조회)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) {
    return json({ error: "로그인이 필요합니다." }, 401);
  }
  const userId = userData.user.id;
  const userEmail = userData.user.email;

  const { paymentKey, orderId, amount, productName } = await req.json();
  if (!paymentKey || !orderId || !amount || !productName) {
    return json({ error: "필수 파라미터가 없습니다." }, 400);
  }

  // 토스페이먼츠에 실제로 결제가 승인됐는지 확인 (시크릿키는 서버 쪽인 여기서만 사용)
  const tossRes = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(`${TOSS_SECRET_KEY}:`)}`,
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  const tossData = await tossRes.json();

  if (!tossRes.ok) {
    return json({ error: "결제 승인 실패", detail: tossData }, 400);
  }

  // 결제가 실제로 확인된 경우에만, service_role 권한으로 orders에 기록 (RLS 우회)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: order, error: insertError } = await adminClient
    .from("orders")
    .insert({
      user_id: userId,
      user_email: userEmail,
      product_name: productName,
      amount,
      toss_order_id: orderId,
      toss_payment_key: paymentKey,
      status: "paid",
    })
    .select()
    .single();

  if (insertError) {
    return json({ error: "주문 저장 실패", detail: insertError.message }, 500);
  }

  return json({ success: true, order });
});
