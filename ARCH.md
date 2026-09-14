# ARCH.md

노르덴돌프 프로젝트의 세부 구조. 핵심 요약은 `CLAUDE.md` 참고.

## 배포

- **프론트엔드**: 이 저장소(`cracknes/goods-shop`)를 GitHub Pages로 배포. 커스텀 도메인 `https://cracknes.cloud/` (기본 주소 `https://cracknes.github.io/goods-shop/`도 계속 동작함)
- **백엔드**: Supabase 프로젝트 `tnvpedaymwozpinujmfk` (region: ap-northeast-1)
- 정적 파일이라 빌드 단계 없음 — HTML/CSS/JS를 main 브랜치에 push하면 그대로 반영됨.
- `cracknes.cloud`는 원래 다른 저장소(`claude-code-deploy`, 잔재미코딩 강의 랜딩페이지)가 쓰던 도메인인데, 이 프로젝트에 CNAME을 추가하면서 GitHub가 자동으로 그쪽 연결을 끊고 이쪽으로 옮겨왔음 (사용자가 의도적으로 선택함). 강의 랜딩페이지는 이제 `cracknes.github.io/claude-code-deploy/`에서만 열림. 네이버 서치어드바이저 인증 파일(`naver...html`)도 그래서 이 저장소 루트로 함께 옮겨옴.

## 페이지 목록

| 파일 | 역할 |
|---|---|
| `index.html` | 카테고리(화장품/남성 의류/여성 의류)별 상품 목록 + 구매(토스 결제 시작). 좌측에 카테고리 전용 탭(사이트 공통 상단 nav와는 별개) |
| `login.html` | 회원가입 / 로그인 |
| `success.html` | 토스 결제 성공 리다이렉트 대상 → Edge Function 호출해 승인 확정 |
| `fail.html` | 토스 결제 실패/취소 리다이렉트 대상 |
| `orders.html` | 내 결제내역 (일반 사용자용, 관리자는 상단 nav에 이 링크가 안 보임) |
| `admin.html` | admin@admin.com 전용. 좌측 탭으로 "결제내역"/"문의내역" 전환, 문의내역 탭에서 답변 작성 가능 |
| `contact.html` | 문의하기 (로그인 불필요, `inquiries` 테이블에 저장). 헤더에서 admin 로그인 시에는 이 링크가 안 보임 |
| `supabase-client.js` | 공용 Supabase 클라이언트 초기화 (URL + publishable key, 공개돼도 안전) |
| `nav.js` | 상단 네비게이션. 로그인 상태 + admin 여부에 따라 보여줄 링크가 달라짐 (아래 "상단 네비게이션 규칙" 참고) |
| `style.css` | 다크 네이비 배경 + 주황(`--orange`) 단일 포인트 컬러 테마. 모바일(640px 이하) 반응형 처리 포함 |

## 상단 네비게이션 규칙 (`nav.js`)

- 브랜드("노르덴돌프") 클릭 시 `index.html`로 이동
- 비로그인: 상품, 문의하기, 로그인
- 일반 로그인 사용자: 상품, 문의하기, 내 결제내역, 로그아웃 (관리자 링크 없음)
- admin@admin.com 로그인: 상품, 내 결제내역·문의하기 링크 숨김, 관리자 링크만 보임, 로그아웃
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
  replied_at timestamptz
);

alter table public.inquiries enable row level security;

create policy "inquiries_insert_anyone"
  on public.inquiries for insert
  to anon, authenticated
  with check (true);

create policy "inquiries_select_admin"
  on public.inquiries for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'admin@admin.com');

create policy "inquiries_update_admin"
  on public.inquiries for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'admin@admin.com')
  with check (auth.jwt() ->> 'email' = 'admin@admin.com');

grant insert on public.inquiries to anon, authenticated;
grant select, update on public.inquiries to authenticated;
```

- 로그인 없이 누구나 등록(INSERT)할 수 있음. SELECT/UPDATE는 `admin@admin.com`만 가능 (관리자 페이지의 문의내역 탭 + 답변 등록 기능용). `website` 필드는 폼에서는 제거했지만 컬럼은 남겨둠 (기존 데이터 호환, 언제든 다시 노출 가능).
- 프론트엔드에서 `.insert(...)` / `.update(...)` 호출 시 `.select()`를 체이닝하면 PostgREST가 처리 후 행을 다시 읽으려고 해서, 그 역할에 SELECT 권한이 없는 경우(anon의 insert) 에러가 남 — `contact.html`은 `.select()` 없이 insert만 호출함.
- 관리자 답변은 `inquiries.reply` / `inquiries.replied_at` 컬럼에 저장 (별도 테이블 없이 1:1 관계라 컬럼으로 충분). 문의를 남긴 사람이 답변을 확인하는 화면은 없음 (로그인 없이 이메일만 남기는 구조라 계정과 연결할 방법이 없음) — 필요하면 이메일로 직접 답변을 보내는 별도 절차가 있어야 함.

## 회원가입 / 이메일 인증

Supabase Auth 설정에서 `mailer_autoconfirm = true`로 설정되어 있어, 가입 즉시 이메일 인증 없이 로그인 가능.
(Management API `PATCH /v1/projects/{ref}/config/auth`로 설정함, 대시보드 수동 조작 아님)

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

## 로컬 개발 환경

- Node.js LTS 설치됨 (winget으로 설치). `npx supabase ...`로 CLI 실행 (전역 설치 안 함).
- Supabase Management API 토큰: `../claude-landing/supabase-token.txt` (이 저장소 밖에 있고, git에 커밋 안 됨)

## 다음에 이어서 작업할 때 참고 (열린 항목)

- 토스페이먼츠 클라이언트/시크릿 키가 아직 **공용 샘플 테스트키**임. 본인 명의로 발급받은 테스트 키(또는 실서비스 전환 시 라이브 키)로 교체하려면: ①토스페이먼츠 개발자센터 가입 → 키 발급 → `index.html`의 `TOSS_CLIENT_KEY` 값 교체 + `npx supabase secrets set TOSS_SECRET_KEY=...` 다시 실행.
- 관리자가 문의에 답변을 남겨도 **문의를 남긴 사람에게 알림이 가지 않음** (이메일 발송 기능 없음, 로그인 없이 이메일만 받는 구조라 계정 연결도 안 됨). 필요하면 이메일 발송 연동(예: Resend, Supabase의 SMTP 설정 등)을 추가로 구현해야 함.
- 상품은 6종(카테고리당 2개) 하드코딩 상태. 실제 재고/가격을 관리자가 웹에서 수정하는 기능은 없음 (요청 시 별도 구현 필요).
- 지금까지의 작업 이력(디자인 변경 히스토리, 발견했던 버그와 원인)은 git 커밋 로그(`git log`)에도 상세히 남아있음 — 특정 변경의 배경이 궁금하면 커밋 메시지를 참고.
