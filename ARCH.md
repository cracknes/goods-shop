# ARCH.md

지후네 하우스 프로젝트의 세부 구조 (이전 이름: 노르덴돌프). 핵심 요약은 `CLAUDE.md` 참고.

## 배포

- **프론트엔드**: 이 저장소(`cracknes/goods-shop`)를 GitHub Pages로 배포. 커스텀 도메인 `https://cracknes.cloud/` (기본 주소 `https://cracknes.github.io/goods-shop/`도 계속 동작함)
- **백엔드**: Supabase 프로젝트 `tnvpedaymwozpinujmfk` (region: ap-northeast-1)
- 정적 파일이라 빌드 단계 없음 — HTML/CSS/JS를 main 브랜치에 push하면 그대로 반영됨.
- `cracknes.cloud`는 원래 다른 저장소(`claude-code-deploy`, 잔재미코딩 강의 랜딩페이지)가 쓰던 도메인인데, 이 프로젝트에 CNAME을 추가하면서 GitHub가 자동으로 그쪽 연결을 끊고 이쪽으로 옮겨왔음 (사용자가 의도적으로 선택함). 강의 랜딩페이지는 이제 `cracknes.github.io/claude-code-deploy/`에서만 열림. 네이버 서치어드바이저 인증 파일(`naver...html`)도 그래서 이 저장소 루트로 함께 옮겨옴.

## 페이지 목록

| 파일 | 역할 |
|---|---|
| `index.html` | 카테고리(화장품/남성 의류/여성 의류)별 상품 목록 + 마지막 두 탭 "한글놀이"/"숫자놀이"(아이용 미니 게임, DB 연동 없음). 좌측에 카테고리 전용 탭(사이트 공통 상단 nav와는 별개). 상품 카드 클릭 시 상세 팝업이 뜨고, 팝업 안에 사진 슬라이드(최대 6장, 좌우 화살표/스와이프로 넘김)가 표시됨. 팝업에 머문 시간을 `product_views`에 기록 (팝업 안의 구매하기 버튼에서 토스 결제 시작) |
| `login.html` | 로그인 (이메일/비밀번호 + 네이버/카카오 간편인증) |
| `signup.html` | 회원가입 (이름/전화번호/이메일/성별/비밀번호 + 네이버/카카오 간편인증) |
| `social-auth.js` | 네이버/카카오 버튼 렌더링 + `signInWithOAuth` 호출 (login/signup 공용) |
| `success.html` | 토스 결제 성공 리다이렉트 대상 → Edge Function 호출해 승인 확정 |
| `fail.html` | 토스 결제 실패/취소 리다이렉트 대상 |
| `orders.html` | 내 결제내역 (일반 사용자용, 관리자는 상단 nav에 이 링크가 안 보임) |
| `admin.html` | admin@admin.com 전용. 좌측 탭 4개: 결제내역 / 문의내역(목록→클릭 시 상세+답변) / 로그인이력(`login_events` 전체 이력) / 상품통계(`product_views`을 상품별로 집계: 조회수·평균/총 조회시간) |
| `contact.html` | 문의하기. 페이지 상단 탭으로 "문의 접수하기"(로그인 불필요)와 "내 문의내역"(로그인 필요, 목록→클릭 시 상세+답변) 전환. `inquiries` 테이블에 저장하며 로그인 상태면 `user_id`도 함께 저장. 헤더에서 admin 로그인 시에는 이 페이지 링크가 안 보임 |
| `supabase-client.js` | 공용 Supabase 클라이언트 초기화 (URL + publishable key, 공개돼도 안전) |
| `nav.js` | 상단 네비게이션. 로그인 상태 + admin 여부에 따라 보여줄 링크가 달라짐 (아래 "상단 네비게이션 규칙" 참고) |
| `style.css` | 밝은 화이트/라이트그레이 배경 + 네이버 그린(`--accent`, `#03c75a`) 단일 포인트 컬러 테마 (처음엔 다크 네이비+주황이었다가 사용자 요청으로 네이버 스타일로 변경됨 — 로고/문구는 그대로 두고 색상 톤만 참고). 모바일(640px 이하) 반응형 처리 포함 |

## 상단 네비게이션 규칙 (`nav.js`)

- 브랜드("지후네 하우스 이지후") 클릭 시 `index.html`로 이동 (헤더에 별도 "상품" 링크는 없음, 로고가 그 역할)
- 비로그인: 로그인 링크만 보임 (문의하기도 로그인해야 보임)
- 일반 로그인 사용자: 문의하기, 결제내역, 로그아웃 (관리자 링크 없음). "문의내역"은 별도 헤더 링크가 아니라 `contact.html` 안의 탭으로 들어가 있음
- admin@admin.com 로그인: 결제내역·문의하기 링크 숨김, 관리자 링크만 보임, 로그아웃
- "문의하기"는 눈에 띄는 버튼(알약 모양, 포인트 컬러)이 아니라 다른 메뉴와 동일한 평범한 텍스트 링크로 통일함.
- 메뉴가 화면 폭보다 길어지면 **줄바꿈**으로 다음 줄에 배치 (가로 스크롤 방식은 항목이 잘려서 안 보이는 문제가 있어 되돌림). 각 메뉴 항목 자체는 `flex-shrink:0` + `white-space:nowrap`으로 텍스트가 항목 내부에서 줄바꿈되지 않도록 막아둠.

## DB 스키마 (`public.orders`)

```sql
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  user_email text,
  product_name text not null,
  amount integer not null,
  toss_order_id text not null unique,
  toss_payment_key text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders_select_own_or_admin"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'admin@admin.com');

-- RLS 정책과 별개로 테이블 권한(GRANT)이 없으면 전부 "permission denied"로 막힘.
-- SQL 에디터로 테이블을 직접 만들 때는 Studio가 자동으로 해주는 이 GRANT를 수동으로 해줘야 함.
grant select on public.orders to authenticated;
grant select, insert on public.orders to service_role;
```

- **INSERT 정책 없음** — 브라우저(anon/authenticated)에서 직접 주문 행을 만들 수 없음. 오직 Edge Function이 `service_role` 키로 삽입 (service_role은 RLS를 항상 무시함). 결제 승인 없이 "결제완료" 행을 위조하는 게 불가능한 구조.
- SELECT 정책 하나로 "내 결제내역"과 "관리자 전체 조회"를 둘 다 처리함 — 관리자 이메일이면 조건의 뒷부분이 참이 되어 전체 행이 보임.
- 상품 정보는 테이블 없이 `index.html`의 `CATEGORIES` JS 배열(카테고리별 상품 목록)에 하드코딩 (요청받은 범위 밖의 상품 관리 기능은 만들지 않음). 상품 썸네일은 카테고리별 파스텔 그라데이션 배경 + 공용 SVG 아이콘(`PRODUCT_ICON`)으로 통일. 처음엔 실제 사진(출처마다 배경/구도가 달라 카드마다 느낌이 들쭉날쭉했음) → 이모지(기기/폰트마다 렌더링 크기가 달라 특정 카테고리만 아이콘이 크거나 작게 보임) 순으로 시도했다가, 폰트에 의존하지 않는 인라인 SVG로 바꿔서 모든 기기에서 100% 동일한 크기가 보장되도록 함.

## DB 스키마 (`public.inquiries`)

```sql
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  website text,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz not null default now(),
  reply text,
  replied_at timestamptz,
  user_id uuid references auth.users(id)
);

alter table public.inquiries enable row level security;

create policy "inquiries_insert_anyone"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

create policy "inquiries_select_own_or_admin"
  on public.inquiries for select
  to authenticated
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "inquiries_update_own_or_admin"
  on public.inquiries for update
  to authenticated
  using (auth.uid() = user_id or auth.jwt() ->> 'email' = 'admin@admin.com')
  with check (auth.uid() = user_id or auth.jwt() ->> 'email' = 'admin@admin.com');

-- 본인은 subject/message를 수정할 수 있지만, reply/replied_at/email/user_id는
-- (RLS의 with check만으로는 컬럼 단위 제한이 안 되므로) 트리거로 강제 보호함.
-- admin이 아닌 사람이 이 컬럼들을 바꾸려 해도 트리거가 조용히 원래 값으로 되돌림.
create or replace function public.inquiries_protect_reply()
returns trigger language plpgsql security definer as $$
begin
  if auth.jwt() ->> 'email' is distinct from 'admin@admin.com' then
    new.reply := old.reply;
    new.replied_at := old.replied_at;
    new.email := old.email;
    new.user_id := old.user_id;
  end if;
  return new;
end;
$$;

create trigger inquiries_protect_reply_trigger
  before update on public.inquiries
  for each row execute function public.inquiries_protect_reply();

grant insert on public.inquiries to anon, authenticated;
grant select, update on public.inquiries to authenticated;
```

- 로그인 없이 누구나 등록(INSERT)할 수 있음. `contact.html`은 제출 시 로그인 상태면 `user_id`를 같이 저장하고(비로그인이면 null), SELECT/UPDATE 정책이 orders 테이블과 동일한 패턴("본인 것 또는 admin이면 전체")이라 `contact.html`의 "문의내역" 탭에서 본인 문의만 조회·수정됨. `website` 필드는 폼에서는 제거했지만 컬럼은 남겨둠 (기존 데이터 호환, 언제든 다시 노출 가능).
- 본인이 제목/내용을 수정할 수 있게 UPDATE 정책을 admin 전용에서 "본인 또는 admin"으로 넓혔음. 다만 그 UPDATE 요청에 `reply` 같은 필드가 같이 실려와도(실수든 악의든) `inquiries_protect_reply` 트리거가 admin이 아니면 그 값들을 무시하고 기존 값으로 고정시킴 — RLS의 `with check`는 행 단위 조건이라 "이 컬럼은 못 바꾸게" 같은 제한을 못 걸어서 트리거로 보강함. (직접 재현 테스트: 본인이 `reply`를 끼워 넣어 보내도 실제로는 안 바뀌는 것 확인함.)
- `user_id` 컬럼을 나중에 추가해서, 그 전에 로그인 없이 남긴 문의는 `user_id`가 비어있었음 → 문의 당시 입력한 이메일이 실제 가입 이메일과 같으면 1회성으로 `update ... from auth.users where email 일치` 매칭해서 소급 연결함.
- 프론트엔드에서 `.insert(...)` / `.update(...)` 호출 시 `.select()`를 체이닝하면 PostgREST가 처리 후 행을 다시 읽으려고 해서, 그 역할에 SELECT 권한이 없는 경우(anon의 insert) 에러가 남 — `contact.html`은 `.select()` 없이 insert만 호출함.
- 관리자 답변은 `inquiries.reply` / `inquiries.replied_at` 컬럼에 저장 (별도 테이블 없이 1:1 관계라 컬럼으로 충분). 비로그인으로 남긴 문의(`user_id` null)는 본인이 나중에 조회/수정할 방법이 없음 — 필요하면 이메일로 직접 답변을 보내는 별도 절차가 있어야 함.

## DB 스키마 (`public.login_events`, `public.product_views`) — 관리자 통계용

```sql
create table public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  email text not null,
  logged_in_at timestamptz not null default now()
);
alter table public.login_events enable row level security;
create policy "login_events_insert_own" on public.login_events for insert to authenticated with check (auth.uid() = user_id);
create policy "login_events_select_admin" on public.login_events for select to authenticated using (auth.jwt() ->> 'email' = 'admin@admin.com');
grant insert on public.login_events to authenticated;
grant select on public.login_events to authenticated;

create table public.product_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  user_email text,
  product_id text not null,
  product_name text not null,
  duration_seconds integer not null,
  viewed_at timestamptz not null default now()
);
alter table public.product_views enable row level security;
create policy "product_views_insert_anyone" on public.product_views for insert to anon, authenticated with check (true);
create policy "product_views_select_admin" on public.product_views for select to authenticated using (auth.jwt() ->> 'email' = 'admin@admin.com');
grant insert on public.product_views to anon, authenticated;
grant select on public.product_views to authenticated;
```

- **로그인 이력**: `auth.audit_log_entries`(Supabase 내장 감사 로그)를 먼저 써보려 했으나 이 프로젝트에서는 비어있었음(호스팅 플랫폼이 감사 로그를 Postgres 테이블이 아니라 별도 분석 로그 스트림으로 보내는 것으로 보임 — 그 로그는 Management API 토큰으로만 조회 가능해서 브라우저 앱에 노출할 수 없음). 그래서 자체 테이블로 직접 기록함:
  - `login.html` (`signInWithPassword` 성공 후), `signup.html` (가입=자동로그인 직후) 에서 각각 `recordLogin(user)` 호출 (`supabase-client.js`에 정의된 공용 함수).
  - 소셜 로그인(네이버/카카오)은 리다이렉트 방식이라 로그인 성공 시점에 우리 코드가 실행 중이지 않음 → `social-auth.js`에서 `signInWithOAuth` 호출 직전에 `sessionStorage.oauthLoginPending = "1"`을 세팅해두고, 리다이렉트로 돌아온 뒤 모든 페이지에서 실행되는 `nav.js`가 이 플래그를 보고 있으면 그때 `recordLogin`을 호출 + 플래그 제거. 이렇게 하면 새로고침 등으로 세션이 복원되는 경우와 "진짜 새로 로그인한 경우"를 구분할 수 있음.
- **상품 조회시간**: `index.html`에서 상품 카드를 클릭하면 별도 페이지가 아니라 팝업(모달)이 뜨고, 연 시각(`Date.now()`)을 저장해뒀다가 팝업을 닫을 때(닫기 버튼/배경 클릭/구매하기 클릭) 차이를 초 단위로 계산해 기록. 비로그인 사용자의 조회도 기록됨(`user_id` null). 탭을 닫거나 새로고침해서 팝업을 안 닫고 나가는 경우는 기록 안 됨(단순화를 위해 `beforeunload` 같은 처리는 넣지 않음).
- 관리자 "상품통계" 탭은 별도 집계 쿼리 없이, `product_views`를 전부 불러온 뒤 프론트엔드에서 상품명 기준으로 group by 해서 조회수/평균/총 시간을 계산함 (데이터 양이 적은 데모 프로젝트라 이 정도로 충분).

## 알려진 설정 이슈 (수정 완료)

`site_url`이 프로젝트 생성 시 기본값인 `http://localhost:3000`으로 방치되어 있었음 → `https://cracknes.cloud`로 수정, `uri_allow_list`에 `https://cracknes.cloud/**`, `https://cracknes.github.io/goods-shop/**` 추가함. (Auth 로그의 `referer` 필드가 실제 접속 주소와 무관하게 `localhost:3000`으로 찍혀서 혼란을 줬던 원인. 소셜 로그인 redirect, 비밀번호 재설정 메일 링크 등에도 영향을 주는 설정이라 실서비스 도메인으로 맞춰둠.)

## 회원가입 / 이메일 인증

Supabase Auth 설정에서 `mailer_autoconfirm = true`로 설정되어 있어, 가입 즉시 이메일 인증 없이 로그인 가능.
(Management API `PATCH /v1/projects/{ref}/config/auth`로 설정함, 대시보드 수동 조작 아님)

**중요**: `mailer_autoconfirm=true`라서 `auth.signUp()`이 성공하면 **그 즉시 로그인 세션도 함께 생성됨** (GoTrue 로그에 `immediate_login_after_signup: true`로 남음). 그래서 가입 성공 후 `login.html`로 보내서 다시 로그인을 요구하면 안 됨 — 이미 로그인된 상태에서 재입력한 비밀번호가 오타 등으로 다르면 "가입은 됐는데 로그인이 안 된다"는 혼란스러운 증상이 생김 (실제로 겪었던 문제). `signup.html`은 성공 시 바로 `index.html`로 이동함.

이메일 회원가입 폼(`signup.html`)은 이름/전화번호/이메일/성별/비밀번호를 받음. 이메일/비밀번호만 실제 로그인 자격증명이고, 나머지(이름/전화번호/성별)는 별도 테이블 없이 `auth.signUp({ email, password, options: { data: { name, phone, gender } } })`으로 **`user_metadata`**에 저장함 (Supabase Auth가 기본 제공하는 부가 정보 저장 공간이라, 프로필 테이블을 따로 만들 필요가 없어서 이 방식을 씀). 나중에 이 값을 조회하려면 `supabaseClient.auth.getUser()`의 `user.user_metadata.name` 처럼 접근하면 됨.

## 네이버 / 카카오 간편인증

- **카카오**: Supabase가 기본 지원하는 provider (`provider: 'kakao'`). `config/auth`에서 `external_kakao_enabled=true`로 켜져 있고, `external_kakao_client_id`/`external_kakao_secret`는 지금 **플레이스홀더 값**(`REPLACE_WITH_KAKAO_REST_API_KEY` 등)이라 실제 카카오 키로 교체하기 전까지는 로그인 시도 시 에러가 남.
- **네이버**: Supabase에 기본 provider가 없어서 ([공식 요청 스레드](https://github.com/orgs/supabase/discussions/35631), 아직 미지원), **Custom OAuth2 Provider** 기능으로 직접 등록함 (`custom_oauth_enabled=true`로 켬).
  - identifier: `custom:naver`
  - authorization_url/token_url/userinfo_url: 네이버 공식 OAuth2 엔드포인트 (`nid.naver.com`, `openapi.naver.com`) 그대로 사용
  - client_id/client_secret: 지금 **플레이스홀더**, 네이버 개발자센터에서 앱 등록 후 발급받은 값으로 교체 필요
  - `attribute_mapping`: 네이버 userinfo 응답이 `{ "response": { "id", "email", "name" } }`처럼 중첩돼 있어서(다른 provider들과 다른 비표준 구조) `provider_id: "response.id"`, `email: "response.email"`, `name: "response.name"`로 매핑해둠. **실제 키를 넣고 로그인 테스트를 해봐야 이 매핑이 정확히 맞는지 확인 가능** — Supabase의 custom provider 기능 자체가 비교적 최근에 나온 기능이라 문서/사례가 많지 않음.
  - 등록/수정은 Management API가 아니라 프로젝트 자체의 Auth Admin API로 함: `POST/PUT {SUPABASE_URL}/auth/v1/admin/custom-providers[/custom:naver]` (헤더에 `apikey`+`Authorization`으로 **service_role 키** 필요, Management API 토큰과는 다름).
- **콜백(리다이렉트) URL**: 네이버/카카오 개발자센터에 앱 등록할 때 아래 주소를 그대로 콜백 URL로 등록하면 됨 — 두 provider 공통으로 프로젝트당 하나:
  `https://tnvpedaymwozpinujmfk.supabase.co/auth/v1/callback`
- 프론트엔드: `login.html`/`signup.html`의 "카카오로 시작하기"/"네이버로 시작하기" 버튼 → `social-auth.js`의 `renderSocialButtons()`가 `supabaseClient.auth.signInWithOAuth({ provider, options: { redirectTo: '.../index.html' } })` 호출. 소셜 로그인은 로그인/회원가입이 하나의 동작이라(처음 누르면 자동 가입) 별도의 "소셜 회원가입" 로직은 없음.

## 결제 흐름 (토스페이먼츠 테스트 모드, v1/payment 연동)

1. `index.html`에서 "구매하기" 클릭 → 브라우저에서 `TossPayments(테스트클라이언트키).requestPayment('카드', {amount, orderId, orderName, successUrl, failUrl})` 호출.
2. 토스 테스트 결제창에서 결제 → 성공 시 `successUrl?paymentKey=...&orderId=...&amount=...`로 리다이렉트.
3. `success.html`이 그 파라미터를 그대로 Supabase Edge Function `confirm-payment`에 전달 (로그인 세션의 JWT가 자동으로 함께 전송됨, `supabaseClient.functions.invoke` 사용).
4. Edge Function이 (a) 호출자가 로그인 상태인지 `auth.getUser()`로 확인, (b) 토스 시크릿키로 `POST https://api.tosspayments.com/v1/payments/confirm` 호출해 실제 결제 승인 확인, (c) 성공하면 `service_role` 권한으로 `orders`에 행 삽입.

### 사용 중인 키 (전부 테스트 모드)

- 토스 클라이언트키(공개, `index.html`에 하드코딩): `test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq`
- 토스 시크릿키(비공개, Supabase secret으로만 존재): `TOSS_SECRET_KEY` — `supabase secrets set`으로 설정, 코드에는 없음
- 위 두 키는 토스페이먼츠 공식 문서의 **공용 샘플 테스트키**. 실제 운영 전환 시 본인 명의로 발급받은 키로 교체 필요.

### 결제창에서 카드번호 입력 시 주의

토스페이먼츠는 **국내용 더미 테스트 카드번호를 제공하지 않는다** ([공식 안내](https://docs.tosspayments.com/blog/how-to-test-toss-payments)). 결제창이 카드번호 형식(체크섬 + 카드사 BIN)을 자체 검증하기 때문에 임의의 숫자는 "유효하지 않음"으로 거부된다. 테스트할 때는 **실제 본인 카드 정보(카드번호/유효기간/비밀번호 앞 2자리/생년월일)를 입력**하면 되고, 테스트 모드라 실제로는 돈이 빠져나가지 않는다.

## Edge Function: `confirm-payment`

- 경로: `supabase/functions/confirm-payment/index.ts`
- 배포: `npx supabase functions deploy confirm-payment` (프로젝트 루트에서, `SUPABASE_ACCESS_TOKEN` 환경변수에 Supabase 개인 액세스 토큰 필요)
- `verify_jwt = true` (`supabase/config.toml`) — 로그인하지 않은 요청은 Supabase 게이트웨이 단계에서 자동 거부됨.
- GitHub Pages(다른 도메인)에서 브라우저로 호출하므로 **CORS 헤더를 직접 응답에 넣어야 함** — Supabase Edge Function은 CORS를 자동으로 처리해주지 않음. `OPTIONS` 프리플라이트 요청에 응답하고, 모든 응답에 `Access-Control-Allow-Origin` 등을 넣지 않으면 curl/서버 테스트는 통과해도 실제 브라우저에서는 요청 자체가 차단됨 (이 프로젝트에서 실제로 겪었던 버그).
- 요청 바디: `{ paymentKey, orderId, amount, productName }`
- 응답: 성공 시 `{ success: true, order: {...} }`, 실패 시 `{ error: "..." }`

## 아이용 게임 (한글놀이 / 숫자놀이)

- `index.html`의 카테고리 탭 마지막 두 개. DB 저장 없이 순수 클라이언트 로직이고, 정답/오답 시 처리 방식이 공용 팝업 스타일로 통일되어 있음: 정답이면 `showCelebration(next)` → `#celebrate-modal` 팝업(🎉❤️, 1.3초 후 자동 닫힘) 후 `next()`로 다음 문제 렌더링, 오답이면 `showWrongAnswerAlert()` → `#wrong-modal` 팝업(😢, 1.3초 후 자동 닫힘, 같은 문제 유지 — 브라우저 기본 `alert()`는 여백을 조절할 수 없어 커스텀 모달로 교체함).
- **한글놀이**: 고정된 단어 목록(`HANGUL_WORDS`)을 하나씩 보여주고 그대로 입력하면 정답.
- **숫자놀이**: `generateNumberProblem()`이 매번 무작위로 덧셈/뺄셈/곱셈 문제를 만듦.
  - 덧셈/뺄셈: 항상 한 자리(1~9) 하나 + 두 자리(10~99) 하나로 조합해서 출제 (둘 다 두 자리가 나오지 않도록 보장). 뺄셈은 결과가 음수 안 되게 큰 수 - 작은 수로 자동 정렬.
  - 곱셈: 기본은 한 자리(1~9) × 한 자리이고, 절반 확률로 11×11~19×19 같은 동일한 두 자리 숫자의 제곱만 예외로 허용 (아이가 아직 두 자리 곱셈을 전반적으로 어려워해서 제곱 형태만 예외로 남김).
- **풀이과정 힌트**: 숫자놀이 제목 옆 `?` 버튼(`#number-hint-btn`) 클릭 시 `showSolution(currentProblem)`이 `#solution-modal` 팝업으로 풀이과정과 정답을 보여줌. 덧셈/뺄셈은 식 그대로, 곱셈은 (b가 9 이하일 때) `4 × 3 = 4 + 4 + 4 = 12`처럼 반복 덧셈으로 풀어서 보여주고 b가 크면 식과 답만 표시. 자동으로 닫히지 않고 닫기 버튼/바깥 클릭으로 닫음.
- 둘 다 상품 그리드 대신 `#products`를 `display:block`으로 바꿔서 카드 하나가 폭 전체를 차지하게 함 (`renderProducts()`가 다시 grid로 복귀시킴).

## 로컬 개발 환경

- Node.js LTS 설치됨 (winget으로 설치). `npx supabase ...`로 CLI 실행 (전역 설치 안 함).
- Supabase Management API 토큰: `../claude-landing/supabase-token.txt` (이 저장소 밖에 있고, git에 커밋 안 됨)

## 다음에 이어서 작업할 때 참고 (열린 항목)

- 토스페이먼츠 클라이언트/시크릿 키가 아직 **공용 샘플 테스트키**임. 본인 명의로 발급받은 테스트 키(또는 실서비스 전환 시 라이브 키)로 교체하려면: ①토스페이먼츠 개발자센터 가입 → 키 발급 → `index.html`의 `TOSS_CLIENT_KEY` 값 교체 + `npx supabase secrets set TOSS_SECRET_KEY=...` 다시 실행.
- **카카오/네이버 간편인증도 아직 플레이스홀더 키**라 실제로는 동작 안 함. 실제 키를 받으면: 카카오는 `config/auth` PATCH로 `external_kakao_client_id`/`external_kakao_secret` 교체, 네이버는 `PUT /auth/v1/admin/custom-providers/custom:naver`로 `client_id`/`client_secret` 교체 (둘 다 위 "네이버/카카오 간편인증" 섹션 참고). 네이버는 처음 실제 로그인 테스트할 때 `attribute_mapping`이 제대로 맞는지도 같이 확인 필요.
- 관리자가 문의에 답변을 남겨도 **문의를 남긴 사람에게 알림이 가지 않음** (이메일 발송 기능 없음, 로그인 없이 이메일만 받는 구조라 계정 연결도 안 됨). 필요하면 이메일 발송 연동(예: Resend, Supabase의 SMTP 설정 등)을 추가로 구현해야 함.
- 상품은 6종(카테고리당 2개) 하드코딩 상태. 실제 재고/가격을 관리자가 웹에서 수정하는 기능은 없음 (요청 시 별도 구현 필요).
- 상품 상세 팝업의 사진 슬라이드(6장)는 아직 **실제 사진이 없어서 그라데이션 자리표시용**임. `getDetailImages()` 함수가 `product.images` 배열이 있으면 그걸 쓰고 없으면 자리표시용을 만들도록 되어 있으니, 실제 사진 URL 6개를 `CATEGORIES`의 각 상품에 `images: [...]`로 추가하면 그대로 실제 사진으로 바뀜.
- 지금까지의 작업 이력(디자인 변경 히스토리, 발견했던 버그와 원인)은 git 커밋 로그(`git log`)에도 상세히 남아있음 — 특정 변경의 배경이 궁금하면 커밋 메시지를 참고.
