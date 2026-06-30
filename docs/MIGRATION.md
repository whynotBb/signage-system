# Supabase → 회사 자체 DB 마이그레이션 큰 그림

> MVP 완료 후 Supabase에서 회사 자체 인프라로 전환할 때의 계획 문서.  
> 현재 구현 기준으로 작성됨 (작성일: 2026-06-30)

---

## 현재 Supabase 의존성 전체 목록

MVP는 Supabase를 BaaS(Backend as a Service)로 활용 중이다. Supabase는 단순한 DB가 아니라 **4가지 서비스를 한꺼번에 제공**하고 있어, 회사 DB로 이전할 때 각각 대체재를 준비해야 한다.

| Supabase가 해주는 것 | 현재 사용 규모 |
|---|---|
| **PostgreSQL DB** (PostgREST 자동 REST API 포함) | 10개 테이블, 전 페이지 CRUD |
| **Auth** (이메일/비밀번호, 쿠키 세션) | 3가지 역할 (super_admin / content_admin / editor) |
| **Realtime** (postgres_changes 구독) | 디스플레이 화면 ↔ 관리자 실시간 동기화 핵심 |
| **Storage** (파일 호스팅) | 뉴스 이미지(`news-images`), 직원 프로필(`employees`) 버킷 |

> **핵심 포인트**: 현재 Next.js 앱은 Supabase PostgREST를 통해 클라이언트에서 DB를 **직접** 호출한다.  
> 회사 DB로 전환하면 이 직접 접근이 불가능 → **API 레이어(백엔드) 구축이 필수**다.

---

## 추천 기술 스택

### DB: PostgreSQL (자체 호스팅)

**이유:**
- Supabase와 **동일 엔진** → 스키마 DDL을 `supabase db dump`로 추출해 그대로 재사용 가능
- `visitor_contents`의 `visitor_name`, `visitor_title` JSON 컬럼 처리 방식이 동일
- MySQL로 가면 JSON 컬럼 마이그레이션, UUID 처리 등에서 추가 작업 발생
- 호스팅: 사내 서버 직접 설치 또는 AWS RDS for PostgreSQL

### 백엔드: Next.js Route Handlers (BFF 패턴)

**이유:**
- **별도 서버 없이** 현재 Next.js 프로젝트 안에 `src/app/api/` 경로로 구현
- 현재 팀 스택(TypeScript, Next.js) 유지 → 러닝커브 없음
- 초기엔 Next.js에 통합, 규모가 커지면 **외부 API 서버로 분리 가능**

### ORM: Prisma

**이유:**
- npm 주간 다운로드 720만+, 채용공고에서 가장 자주 언급되는 Node.js ORM
- TypeScript 타입 자동 생성 (`prisma generate`)
- 마이그레이션 도구 내장 (`prisma migrate`)
- `Prisma Studio` GUI로 DB 데이터를 브라우저에서 직접 확인 가능 → 백엔드 미경험자에게 특히 유용
- 문서화 우수, 학습 자료 풍부

### Auth: Auth.js (NextAuth v5)

**이유:**
- Credentials Provider로 이메일/비밀번호 방식 그대로 유지
- 쿠키 기반 세션 내장 → 현재 `@supabase/ssr` 세션 방식과 동일한 패턴
- 향후 SSO/AD 연동 시 Provider만 추가하면 됨
- `proxy.ts`(미들웨어)와 연동 구조가 명확

### Realtime: SSE + PostgreSQL LISTEN/NOTIFY

**이유:**
- PostgreSQL 내장 기능인 `LISTEN/NOTIFY`로 DB 변경을 서버가 감지
- Next.js Route Handler에서 `ReadableStream`으로 SSE 엔드포인트 구현
- 별도 WebSocket 서버 불필요
- `RealtimeSync.tsx`의 EventSource 교체로 프런트엔드 수정 최소화

### Storage: MinIO (자체 호스팅 S3 호환)

**이유:**
- AWS S3와 동일한 API → 코드 변경 최소화 (`@aws-sdk/client-s3` 사용)
- 회사 서버에 직접 설치 가능 (Docker 1줄)
- 향후 실제 AWS S3로 업그레이드해도 코드 변경 없음

---

## 단계별 마이그레이션 계획

```
Phase 0  인프라 결정·환경 구성     ── 1~2일
Phase 1  DB 스키마 이전            ── 2~3일
Phase 2  백엔드 API 레이어 구축    ── 4~6일  ← 가장 큰 작업
Phase 3  Auth 교체                 ── 2~3일
Phase 4  Storage 교체              ── 1~2일
Phase 5  Realtime 대체             ── 2~3일  ← 가장 까다로운 작업
Phase 6  프런트엔드 코드 교체      ── 3~5일
Phase 7  데이터 이전 + QA          ── 2~3일
─────────────────────────────────────────
총 예상                              약 3~4주
```

---

### Phase 0: 인프라 결정 및 환경 구성

**결정 사항:**
- 사내 서버 vs 클라우드(AWS/NHN/KT) 중 어디에 PostgreSQL을 설치할지
- MinIO 설치 위치 (보통 PostgreSQL과 같은 서버)
- 개발/스테이징/프로덕션 환경 분리 방침

**산출물:**
- Docker Compose로 로컬 개발 환경 (PostgreSQL + MinIO) 구성
- CI/CD 파이프라인 기초 설정

---

### Phase 1: DB 스키마 이전

**작업 내용:**
1. Supabase에서 DDL 추출: `supabase db dump --schema public`
2. Supabase 전용 구문(RLS 정책, `auth.users` 참조) 제거
3. 회사 PostgreSQL에 스키마 재생성
4. Prisma 스키마 파일 작성 (`prisma/schema.prisma`, 현재 `src/types/database.ts` 대체)

**핵심 고려사항:**
- 현재 `profiles.id`가 Supabase `auth.users.id`를 FK로 참조 → 자체 users 테이블로 분리 필요
- UUID 기본키는 그대로 유지 가능 (`gen_random_uuid()` PostgreSQL 내장 함수)

---

### Phase 2: 백엔드 API 레이어 구축

현재 클라이언트에서 직접 호출하던 Supabase PostgREST를 Next.js Route Handlers로 대체.

**구현할 API 엔드포인트 (10개 테이블 기준):**

```
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout

GET    /api/divisions
POST   /api/divisions
PUT    /api/divisions/:id
DELETE /api/divisions/:id

GET    /api/teams
POST   /api/teams
...   (employees, news, visitor, video, image, company-intro 동일 패턴)
```

**RBAC 구현:**
- 현재 `proxy.ts`의 역할 검증 로직을 API Route 미들웨어로 이전
- `super_admin` / `content_admin` / `editor` 권한 체계 유지

---

### Phase 3: Auth 교체

**현재 → 이후 대응:**

| 현재 (Supabase) | 이후 (Auth.js) |
|---|---|
| `supabase.auth.signInWithPassword()` | Auth.js Credentials Provider |
| `supabase.auth.signUp()` | 자체 register API + Auth.js |
| `@supabase/ssr` 쿠키 세션 | Auth.js 세션 (동일한 쿠키 패턴) |
| `proxy.ts` 세션 검증 | Auth.js `auth()` 함수로 대체 |

**주의:**
- 기존 사용자는 **비밀번호 재설정 필요** (Supabase의 bcrypt 해시를 직접 복사할 수도 있지만, 검증 필요)
- 마이그레이션 타이밍에 따라 사용자에게 사전 공지 필요

---

### Phase 4: Storage 교체

**현재 → 이후 대응:**

| 현재 (Supabase Storage) | 이후 (MinIO) |
|---|---|
| `supabase.storage.from('news-images').upload()` | `@aws-sdk/client-s3` PutObject |
| `supabase.storage.from().getPublicUrl()` | MinIO 퍼블릭 URL 또는 서명된 URL |
| `supabase.storage.from().remove()` | S3 DeleteObject |

**파일 마이그레이션:**
- 기존 Supabase Storage의 파일을 MinIO로 복사
- DB에 저장된 이미지 URL을 새 도메인으로 일괄 업데이트 (SQL `UPDATE`)

---

### Phase 5: Realtime 대체 ⚡ 가장 주의 구간

**현재 구조** (`src/components/display/RealtimeSync.tsx`):
```
Supabase postgres_changes 구독
→ 6개 테이블 변경 감지 (divisions, teams, employees, company_intro_config, news_contents, visitor_contents)
→ router.refresh() 호출
→ 화면 즉시 갱신
```

**대체 방안 A: PostgreSQL LISTEN/NOTIFY + SSE (추천)**

```
DB 변경 발생
→ PostgreSQL TRIGGER 발동 → NOTIFY 'signage_sync'
→ Next.js API Route(/api/realtime) 에서 LISTEN 중
→ SSE 이벤트를 디스플레이 클라이언트에 전송
→ 클라이언트의 EventSource가 수신
→ router.refresh() 호출
```

**대체 방안 B: 단순 폴링 (구현 쉬움)**
- 30초마다 서버에서 최신 데이터 조회
- 구현 매우 단순 (`setInterval` + `router.refresh()`)
- 사이니지 특성상 30초 딜레이가 허용된다면 충분히 실용적

> Realtime의 즉각성이 정말 필요한지 팀과 재확인 권장.  
> 폴링으로도 충분하다면 구현 난이도가 크게 낮아진다.

---

### Phase 6: 프런트엔드 코드 교체

**변경 패턴 (반복 작업):**

```typescript
// 현재 (Supabase 직접 호출)
const supabase = createClient()
const { data } = await supabase.from('news_contents').select('*').eq('is_active', true)

// 이후 (API 호출)
const data = await fetch('/api/news?is_active=true').then(r => r.json())
```

**영향 파일 범위:**

| 파일 | 변경 방향 |
|---|---|
| `src/lib/supabase/client.ts` | API 클라이언트 유틸로 교체 |
| `src/lib/supabase/server.ts` | 삭제 (Route Handlers에서 Prisma Client 직접 사용) |
| `src/lib/supabase/query-keys.ts` | 그대로 유지 (TanStack Query 구조 변경 없음) |
| `src/proxy.ts` | Auth.js 방식으로 수정 |
| 각 페이지/컴포넌트의 `queryFn` | fetch 기반으로 교체 |
| `src/components/display/RealtimeSync.tsx` | SSE EventSource로 교체 |

**삭제 패키지:**
```
@supabase/ssr
@supabase/supabase-js
```

**추가 패키지:**
```
prisma (CLI, devDependency)
@prisma/client
next-auth (NextAuth v5 / Auth.js)
@auth/prisma-adapter (Prisma ↔ Auth.js 연결)
@aws-sdk/client-s3 (MinIO용)
```

---

### Phase 7: 데이터 이전 + QA

**데이터 마이그레이션:**
1. Supabase에서 데이터 덤프: `supabase db dump --data-only`
2. 회사 PostgreSQL에 임포트
3. Storage 파일 복사 (Supabase CLI → MinIO)
4. 이미지 URL 일괄 업데이트 SQL 실행

**QA 체크리스트:**
- [ ] 로그인/로그아웃/회원가입
- [ ] 역할별 접근 권한 (3가지 역할)
- [ ] 조직도 CRUD + 실시간 반영
- [ ] 뉴스/방문자 이미지 업로드 및 표시
- [ ] 사이니지 디스플레이 화면 실시간 동기화
- [ ] 직원 프로필 이미지 업로드/표시

---

## 위험 요소 및 주의사항

| 항목 | 위험도 | 대응 방안 |
|---|---|---|
| Realtime 대체 | 높음 | 먼저 폴링으로 구현 후 필요 시 SSE로 업그레이드 |
| Storage URL 하드코딩 | 중간 | 이전 후 DB UPDATE SQL 일괄 실행 |
| Auth 세션 단절 | 중간 | 배포 시 사용자 재로그인 공지 |
| DB 연결 풀 (Next.js) | 중간 | Prisma + PgBouncer 또는 Prisma Accelerate 사용 |
| Supabase Auth UID → 자체 ID | 높음 | `profiles` 테이블의 FK 구조 재설계 필요 |

---

## 요약: 무엇이 크고 무엇이 작은가

**많이 바뀌는 것 (핵심 작업):**
- `src/lib/supabase/` 전체 → API 클라이언트 레이어로 교체
- Auth 시스템 (세션 방식 재구현)
- Realtime 구독 방식
- 각 페이지의 `queryFn` (fetch 기반으로 전환)

**거의 안 바뀌는 것:**
- UI/UX, 컴포넌트 구조 (Tailwind, shadcn)
- TanStack Query 키 구조 및 패턴
- DB 스키마 (PostgreSQL 유지 시)
- Zustand 상태 구조
- 비즈니스 로직 전반
