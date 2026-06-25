# 사이니지 관리 시스템 (Hubilon Signage) 개발 로드맵

> 하드코딩으로 운영되던 사이니지 콘텐츠를 비개발자가 웹으로 직접 편집하고, 변경 사항이 Supabase Realtime을 통해 디스플레이 화면에 즉시 반영되는 콘텐츠 관리 시스템

## 개요

사이니지 관리 시스템은 회사 내부 운영 담당자(슈퍼어드민·콘텐츠어드민·편집자)를 위한 웹 기반 사이니지 콘텐츠 관리 도구로 다음 기능을 제공합니다:

- **관리자 앱 (`/admin`)**: 조직도·뉴스·방문자·회사소개·동영상·이미지 콘텐츠를 역할 기반으로 등록·수정·삭제 (PC~모바일 반응형)
- **디스플레이 화면 (`/`)**: TV/키오스크용 풀스크린 Swiper 슬라이드쇼 (로그인 불필요, 공개)
- **실시간 반영**: Supabase Realtime 구독으로 관리자 변경 사항이 디스플레이에 새로고침 없이 즉시 반영

### 기술 스택

- **프레임워크**: Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5
- **스타일링/UI**: TailwindCSS 4, shadcn/ui, Lucide React
- **폼/검증**: react-hook-form 7.80, Zod 4.4
- **상태 관리**: TanStack Query 5.101 (서버 데이터), Zustand 5.0 (UI/인증 상태)
- **백엔드**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **슬라이드쇼**: Swiper v11
- **배포**: Vercel / 패키지 관리: npm

### 역할 체계

| 역할 | 코드 | 권한 요약 |
|------|------|----------|
| 슈퍼어드민 | `super_admin` | 전체 권한 + 사용자 역할 변경/계정 비활성화 |
| 콘텐츠어드민 | `content_admin` | 모든 콘텐츠 등록/수정/삭제 |
| 편집자 | `editor` | 뉴스·방문자 등록 + 본인 등록 콘텐츠만 수정/삭제 |

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 구현**
   - 로드맵의 Task 명세를 따라 기능 구현
   - **API 연동·비즈니스 로직 구현 시 Playwright MCP로 E2E 테스트 수행 필수**
   - 각 단계 완료 후 진행 상황 업데이트 및 테스트 결과 검증

3. **로드맵 업데이트**
   - 완료된 Task 및 세부 구현 사항을 `- [x]`로 표시
   - Phase 완료 시 Phase 제목에 ✅ 표시

### 상태 표기 규칙

- `- [x]` : 완료된 Task / 세부 구현 사항
- `- [ ]` : 미완료 Task / 세부 구현 사항
- `(Fxxx)` : 해당 Task가 구현하는 PRD 기능 ID

> **참고**: PRD 기능 ID는 `F001`~`F035`이며, **`F025`는 결번**(예약된 ID 없음)입니다. 실제 구현 대상 기능은 총 34개입니다.

---

## 현재 상태 요약 (2026-06-25 기준)

- ✅ **프로젝트 스캐폴딩 완료**: 라우트 그룹 구조, 빈 페이지 껍데기, 공통 레이아웃, shadcn/ui + composite 컴포넌트, Zustand 스토어, 인증 폼 검증 스키마
- ✅ **도메인 타입 정의 완료**: 9개 Supabase 테이블 TypeScript 타입(Row/Insert/Update), Database 네임스페이스, `@/types` 일괄 export, auth-store Profile 타입 통합
- ✅ **Supabase 클라이언트 연동 완료**: `@supabase/supabase-js` + `@supabase/ssr` 설치, 브라우저/서버 클라이언트 분리(`src/lib/supabase/`), TanStack Query queryKey 컨벤션, 헬스 체크 구현, `.env.local` 실제 키 설정 완료
- ✅ **DB 스키마·마이그레이션 완료**: 9개 테이블, updated_at 트리거, handle_new_user Auth 트리거(role=editor 자동 생성), company_intro_config 시드, FK 인덱스 7개
- ✅ **RLS·Storage 완료**: `current_user_role()` SECURITY DEFINER 헬퍼, 9개 테이블 역할 기반 RLS 정책, Storage 버킷 3종(employees/videos/images), 보안 강화(불필요한 PUBLIC EXECUTE 박탈)
- ✅ **TASK-006 완료**: 로그인 기능 Supabase Auth 연동 (`auth-errors.ts` + `login/page.tsx` 수정), Playwright E2E 검증
- ✅ **TASK-007 완료**: 회원가입 기능 Supabase Auth 연동 (`register/page.tsx` signUp + 성공 UI, `auth-errors.ts` 에러 코드 보강)
- ✅ **TASK-008 완료**: 이메일 인증 콜백 라우트 (`/admin/auth/callback/route.ts`), `verified=true`/`error=` 쿼리 파라미터 toast 처리
- ✅ **TASK-009 완료**: `proxy.ts` 라우트 가드 구현 (`/admin/**` 비로그인 차단 → `/admin/login` 리디렉션), `nav-user.tsx` 로그아웃 `supabase.auth.signOut()` 연동, Playwright E2E 검증
- ✅ **TASK-010 완료**: 대시보드 현황 개요 구현 — `dashboard-stats.tsx` 클라이언트 컴포넌트 신규 생성, 5개 카테고리별 TanStack Query count 쿼리(`query-keys.ts` activeCount 키 추가), 현재 사용자 역할 표시, Playwright E2E 검증
- ✅ **TASK-011 완료**: 조직도 UI/UX 설계 + DB 마이그레이션(divisions.color, employees.position/org_role) + @dnd-kit/react-easy-crop 설치, TypeScript 타입 반영
- ✅ **TASK-012 완료**: OrgBoard DnD 전체 UI + 파견 Badge·org_role 연동·독립 팀 컬러·퇴사자 관리 서브메뉴·DnD 애니메이션 개선 포함 전체 구현 완료
- ✅ **TASK-013 완료**: 뉴스 관리 CRUD — Zod 스키마(`validations/news.ts`), 목록 테이블(`news-table.tsx`, TanStack Query + @dnd-kit 순서 변경 + 인라인 Switch 토글 + editor 권한 제어), 등록/수정 폼(`news-form-dialog.tsx`, react-easy-crop 16:9 크롭 + Storage 업로드), 삭제 모달(`delete-news-dialog.tsx`, Storage 이미지 동시 삭제), DB 마이그레이션(`news_contents.display_order`), Playwright E2E 검증 완료
- ⬜ **미완료**: TASK-014 이후 — 방문자·회사소개·동영상·이미지 관리 CRUD, Realtime 연동, 사용자 관리, RBAC 통합

---

## 개발 단계

### Phase 1: 기반 인프라 구축

**목표**: Supabase 연동 토대와 전 기능이 공유할 도메인 타입·DB 스키마·보안 정책을 마련하여, 이후 모든 Phase가 병렬로 진행될 수 있는 기반을 완성한다.

**완료 기준**: Supabase 클라이언트로 9개 테이블에 정상 접근 가능하고, 도메인 타입이 전 영역에서 import 가능하며, RLS 정책과 Storage 버킷이 동작한다.

- [x] **TASK-001: 프로젝트 구조 및 라우팅 스캐폴딩** (인프라)
  - [x] `(admin)`, `(admin-auth)` 라우트 그룹 및 8개 관리 페이지 빈 껍데기 생성
  - [x] 디스플레이 화면(`/`) 풀스크린 껍데기 생성
  - [x] 공통 레이아웃(Sidebar, MobileNav, BreadcrumbNav, ThemeToggle, UserNav) 구현
  - [x] AppProviders(QueryClient, ThemeProvider, Tooltip, Toaster) 구성
  - [x] shadcn/ui 기본 컴포넌트 및 composite 컴포넌트(PageHeader, LoadingButton, ConfirmDialog, EmptyState 등) 구비
  - [x] Zustand 스토어(`ui-store`, `auth-store`) 및 인증 폼 검증 스키마(`validations/auth.ts`) 작성

- [x] **TASK-002: 도메인 타입 및 인터페이스 정의** (인프라) - 우선순위
  - [x] `profiles`, `divisions`, `teams`, `employees` 타입 정의
  - [x] `news_contents`, `visitor_contents`, `company_intro_config` 타입 정의
  - [x] `video_contents`, `image_contents` 타입 정의
  - [x] `UserRole` union 타입 및 콘텐츠 활성 상태/게시 스케줄 관련 공용 타입 정의
  - [x] Supabase `Database` 네임스페이스 타입 정의 및 `@/types`에서 일괄 export

- [x] **TASK-003: Supabase 클라이언트 및 환경 설정** (인프라)
  - [x] `@supabase/supabase-js` / `@supabase/ssr` 설치 및 환경 변수(`.env.local`) 구성
  - [x] 브라우저 클라이언트 / 서버 클라이언트 분리 생성 (`src/lib/supabase/`)
  - [x] TanStack Query와 Supabase 연동 패턴(쿼리 키 컨벤션) 정립 (`src/lib/supabase/query-keys.ts`)
  - [x] 연결 검증용 헬스 체크 쿼리 작성 (`src/lib/supabase/health.ts`)

- [x] **TASK-004: 데이터베이스 스키마 및 마이그레이션** (인프라)
  - [x] 9개 테이블 마이그레이션 SQL 작성 (`profiles`, `divisions`, `teams`, `employees`, `news_contents`, `visitor_contents`, `company_intro_config`, `video_contents`, `image_contents`)
  - [x] 외래키 관계 설정 (teams→divisions, employees→divisions/teams, contents→profiles)
  - [x] `company_intro_config` 단일 행 시드 데이터 삽입 (is_enabled 초기값)
  - [x] `auth.users` → `profiles` 동기화 트리거 작성 (회원가입 시 role=editor 자동 생성)

- [x] **TASK-005: RLS 보안 정책 및 Storage 버킷 설정** (인프라)
  - [x] 테이블별 Row Level Security 정책 작성 (역할 기반 SELECT/INSERT/UPDATE/DELETE)
  - [x] editor "본인 등록 콘텐츠만 수정/삭제" 정책 (`created_by = auth.uid()`) — 뉴스·방문자 대상
  - [x] 디스플레이 화면 공개 읽기 정책 (익명 SELECT 허용)
  - [x] Storage 버킷 3종 생성 및 접근 정책: 직원 프로필 사진 / 동영상 / 이미지
  - [ ] **테스트 체크리스트**: 역할별 SQL 권한 시나리오 검증 (super_admin/content_admin/editor/anon)

---

### Phase 2: 인증 시스템 구현

**목표**: Supabase Auth 기반 로그인·회원가입·이메일 인증 흐름을 완성하고, 인증 상태를 앱 전역에서 사용 가능하게 한다.

**완료 기준**: 비로그인 사용자가 회원가입 → 이메일 인증 → editor 권한 자동 부여 → 로그인 → 대시보드 진입까지 전 흐름이 동작하고, 미인증 상태로 `/admin` 진입 시 로그인 페이지로 리디렉션된다.

- [x] **TASK-006: 로그인 기능 구현** (F001) - 우선순위
  - [x] 로그인 페이지 UI 구현 (이메일/비밀번호 폼, Zod 유효성 검사)
  - [x] Supabase Auth `signInWithPassword` 연동
  - [x] 인증 실패 시 에러 메시지 표시, 성공 시 대시보드 이동
  - [x] `auth-store`에 로그인 사용자/역할 상태 반영 (persist)
  - [x] 회원가입 페이지 링크 연결
  - [x] **테스트 체크리스트**: 로그인 성공/실패, 잘못된 형식 입력, 세션 유지 E2E 테스트 (Playwright MCP)

- [x] **TASK-007: 회원가입 기능 구현** (F026)
  - [x] 회원가입 페이지 UI 구현 (이름/이메일/비밀번호 폼, Zod 유효성 검사)
  - [x] Supabase Auth `signUp` 연동 및 이메일 인증 메일 발송 트리거
  - [x] 가입 신청 완료 안내 메시지 표시 ("인증 메일을 확인하세요")
  - [x] **테스트 체크리스트**: 가입 신청 성공 UI·폼 유효성 검사 Playwright E2E 확인. 중복 이메일은 Supabase 이메일 인증 모드 기본 동작(이메일 열거 방지를 위해 성공 응답 반환)으로 UI 레벨 검증 생략. `auth-errors.ts`에 `user_already_exists` 에러 코드 처리 추가.

- [x] **TASK-008: 이메일 인증 완료 흐름 구현** (F027)
  - [x] 이메일 인증 완료 페이지 라우트 추가 (Supabase Auth 콜백 URL)
  - [x] 인증 토큰 유효성 검사 및 가입 완료 처리
  - [x] `profiles` 테이블 레코드 생성 확인 (role=editor 자동 부여 — TASK-004 트리거 연동)
  - [x] 인증 성공/실패 상태 메시지 및 로그인 페이지 이동 버튼
  - [x] **테스트 체크리스트**: 유효/만료/잘못된 토큰 시나리오, profiles 레코드 생성 검증 (Playwright MCP)

- [x] **TASK-009: 라우트 가드 및 인증 미들웨어 구현** (F001)
  - [x] `proxy.ts`(Next.js 16) 또는 서버 컴포넌트 가드로 `/admin` 비로그인 접근 차단 및 로그인 리디렉션
  - [x] 세션 갱신/만료 처리 및 로그아웃 기능
  - [x] 디스플레이 화면(`/`)은 공개 접근 유지 (가드 제외)
  - [x] **테스트 체크리스트**: 비로그인 `/admin` 진입 → 리디렉션, 로그아웃 후 보호 페이지 접근 차단 (Playwright MCP)

---

### Phase 3: 관리자 콘텐츠 관리 기능 구현

**목표**: 대시보드 및 6개 콘텐츠 관리 페이지의 UI와 CRUD 기능을 완성하여 운영 담당자가 모든 사이니지 콘텐츠를 웹으로 편집할 수 있게 한다.

**완료 기준**: 각 페이지에서 목록 조회·등록·수정·삭제가 Supabase DB/Storage와 연동되어 동작하고, 모든 변경 사항이 데이터베이스에 정상 반영된다.

- [x] **TASK-010: 대시보드 현황 개요 구현** (F002) - 우선순위
  - [x] 카테고리별 활성 건수 요약 카드 (뉴스, 방문자, 동영상, 이미지, 직원)
  - [x] 각 카드에서 해당 관리 페이지로 빠른 이동 링크
  - [x] 현재 로그인 사용자 역할 표시
  - [x] TanStack Query로 카테고리별 count 집계 쿼리 연동
  - [x] **테스트 체크리스트**: 수치 렌더링(NaN/undefined 없음), 카드 클릭 네비게이션 (Playwright MCP) — 집계 정확성은 TASK-011~017 CRUD 구현 후 실데이터로 재검증

- [x] **TASK-011: 조직도 UI/UX 설계 및 DB 스키마 확장** ✅ (F003~F008)
  - [x] ui-ux-designer 에이전트로 조직도 관리 페이지 레이아웃 설계 및 Artifact 목업 생성
  - [x] DB 마이그레이션: `divisions.color` (실 대표 색상, `TEXT DEFAULT '#6366f1'`)
  - [x] DB 마이그레이션: `employees.position` (직위, `TEXT NULLABLE`)
  - [x] DB 마이그레이션: `employees.org_role` (`TEXT DEFAULT 'member'`)
  - [x] TypeScript 타입(`src/types/database.ts`) 신규 컬럼 반영
  - [x] `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 패키지 설치
  - [x] `react-easy-crop` 패키지 설치 (프로필 사진 원형 크롭용)
  - [x] 기존 DivisionSection/TeamSection 삭제 → OrgBoard 컴포넌트로 전면 대체
  - [ ] DB 마이그레이션: `teams.color` (독립 팀 대표 색상, `TEXT DEFAULT '#6366f1'`)

- [x] **TASK-012: 조직도 관리 — 드래그 앤 드롭 전체 UI 구현** ✅ (F003~F008)
  - [x] 대표/부대표 섹션 카드 (페이지 최상단, `org_role` 기반 지정)
  - [x] 실-팀-직원 계층 카드 그룹 (실 좌측 색상 배지, 팀 블록, 직원 목록)
  - [x] 예외 처리: `division_id=NULL` 독립 팀, `team_id=NULL` 실 직속 직원
  - [x] `@dnd-kit` 3중 DndContext — 실/팀/직원 독립 순서 변경
  - [x] `display_order` 낙관적 업데이트 → Supabase upsert 반영
  - [x] 실 CRUD 모달 — 이름 + 네이티브 컬러 피커
  - [x] 팀 CRUD 모달 — 이름 + 소속 실 선택 (NULL 독립 팀 옵션)
  - [x] 직원 CRUD — 이름/직위/직책/프로필 사진(react-easy-crop 원형 크롭+Storage)/소속 실·팀/파견·퇴사 토글 (기본 CRUD)
  - [x] `src/lib/image-utils.ts` getCroppedImg 유틸, `crop-dialog.tsx` 컴포넌트
  - [x] Zod 스키마(`src/lib/validations/org.ts`) 3종 + TypeScript 타입 export
  - [x] **테스트 체크리스트**: 드래그 앤 드롭, 직원 등록/수정/삭제, 대표 지정, 실/팀 CRUD (Playwright MCP) — 크로스 컨테이너 DnD 버그 3건 수정 포함(Maximum update depth, findContainer prefix 매핑, dragStartContainerRef)
  - [x] **[버그 수정]** 파견 직원(`is_dispatched=true`) 조직도 계속 표시 — 파견 Badge 표출, 소속 실·팀 유지 (`fetchActiveEmployees` 쿼리의 `is_dispatched` 필터 제거)
  - [x] **[기능 추가]** 직위 옵션 확장: '이사', '대표', '부대표' 추가
  - [x] **[기능 추가]** 대표/부대표 직위 선택 시 `org_role` 자동 설정(`대표` → `representative`, `부대표` → `vice_representative`), 소속 실·팀 입력 초기화 및 비활성화
  - [x] **[기능 추가]** 독립 팀(`division_id=NULL`) 컬러 지정 — `TeamFormDialog`에서 독립 팀일 때만 컬러 피커 표시, OrgBoard 독립 팀 카드 컬러 스타일링
  - [x] **[기능 추가]** 퇴사자 관리 페이지(`/admin/org/resigned`) 추가 — 퇴사 직원 목록 표시, 삭제 및 퇴사 취소(`is_resigned` 토글) 기능
  - [x] **[기능 추가]** 사이드바 중첩 메뉴 지원 — '조직도 관리' 하위에 '퇴사자 관리' 서브메뉴 추가 (NAV_ITEMS `children` 필드 + NavMain SidebarMenuSub 렌더링 확장)
  - [x] **[개선]** DnD 드래그 애니메이션 자연스럽게 개선 (CSS transition/transform 튜닝, 드롭 스냅 동작 부드럽게)
  - [x] **테스트 체크리스트 (추가)**: 파견 직원 조직도 표시 및 Badge 확인, 대표/부대표 직위 선택 시 org_role 자동 설정·소속 비활성화, 독립 팀 컬러 저장 및 카드 반영, 퇴사자 관리 CRUD·퇴사 취소 (Playwright MCP)

- [x] **TASK-013: 뉴스 관리 CRUD 구현** ✅ (F009, F010, F011, F012) — 완료 (2026-06-25)
  - [x] 뉴스 목록 테이블 조회 — 제목, 활성 상태, 게시 기간, 등록자 (F009) — `news-table.tsx` TanStack Query 연동
  - [x] 뉴스 등록 폼 — 제목, 부제목, 이미지 업로드, 게시 시작/종료 일시 (F010) — `news-form-dialog.tsx` react-easy-crop 16:9 크롭 + Supabase Storage 업로드
  - [x] 뉴스 수정 폼 — editor는 본인 등록 건만 접근 (F011) — `news-form-dialog.tsx` 수정 모드
  - [x] 뉴스 삭제 확인 모달 — editor는 본인 등록 건만 접근 (F012) — `delete-news-dialog.tsx` Storage 이미지 동시 삭제
  - [x] 전 역할 접근 + editor 본인 콘텐츠 한정 수정/삭제 UI 조건 처리 (RLS 연동) — editor 역할 권한 제어 적용
  - [x] **[기능 추가]** 뉴스 목록 드래그 순서 변경(@dnd-kit) — DB 마이그레이션: `news_contents.display_order` 컬럼 추가
  - [x] **[기능 추가]** 인라인 Switch 활성 토글 — 목록 테이블에서 즉시 활성/비활성 전환
  - [x] **[추가]** Zod 스키마/타입 정의 (`src/lib/validations/news.ts`)
  - [x] **테스트 체크리스트**: 등록/수정/삭제, editor의 타인 콘텐츠 수정 차단, 게시 스케줄 저장, 인라인 토글 (Playwright MCP) — E2E 검증 완료

- [ ] **TASK-014: 방문자 관리 CRUD 구현** (F013, F014, F015, F016)
  - [ ] 방문자 목록 테이블 조회 — 방문 조직, 이름, 직책, 방문 장소, 게시 기간 (F013)
  - [ ] 방문자 등록 폼 — 조직/이름/직책/방문 장소, 게시 시작/종료 일시 (F014)
  - [ ] 방문자 수정 폼 — editor는 본인 등록 건만 접근 (F015)
  - [ ] 방문자 삭제 확인 모달 — editor는 본인 등록 건만 접근 (F016)
  - [ ] 전 역할 접근 + editor 본인 콘텐츠 한정 수정/삭제 UI 조건 처리 (RLS 연동)
  - [ ] **테스트 체크리스트**: 등록/수정/삭제, editor의 타인 콘텐츠 수정 차단, 게시 스케줄 저장 (Playwright MCP)

- [ ] **TASK-015: 회사소개 On/Off 토글 구현** (F017)
  - [ ] 현재 회사소개 슬라이드 활성화 상태(on/off) 표시
  - [ ] SafeInsight + In-Guide 슬라이드를 묶어 한 번에 토글 (`company_intro_config.is_enabled`)
  - [ ] 슬라이드 내용은 하드코딩 유지 — **편집 폼 없음** (on/off만 제어)
  - [ ] 페이지 접근 제어: super_admin, content_admin만
  - [ ] **테스트 체크리스트**: 토글 상태 저장 및 재진입 시 유지, 권한 없는 역할 접근 차단 (Playwright MCP)

- [ ] **TASK-016: 동영상 관리 구현** (F018, F019)
  - [ ] 동영상 목록 카드/테이블 조회 — 제목, 활성 상태 (F018)
  - [ ] 동영상 등록 폼 — 제목 입력, 동영상 파일 업로드(Supabase Storage) (F018)
  - [ ] 동영상 삭제 확인 모달 — Storage 파일 동시 삭제 (F019)
  - [ ] 페이지 접근 제어: super_admin, content_admin만
  - [ ] **테스트 체크리스트**: 동영상 업로드/삭제, 대용량 파일 처리, Storage 정합성 (Playwright MCP)

- [ ] **TASK-017: 이미지 관리 구현** (F020, F021)
  - [ ] 이미지 목록 그리드/테이블 조회 — 썸네일, 제목, 활성 상태 (F020)
  - [ ] 이미지 등록 폼 — 제목 입력, 이미지 파일 업로드(Supabase Storage) (F020)
  - [ ] 이미지 삭제 확인 모달 — Storage 파일 동시 삭제 (F021)
  - [ ] 페이지 접근 제어: super_admin, content_admin만
  - [ ] **테스트 체크리스트**: 이미지 업로드/삭제, 썸네일 렌더링, Storage 정합성 (Playwright MCP)

---

### Phase 4: 사용자 관리 및 권한 체계(RBAC) 완성

**목표**: 슈퍼어드민의 사용자 계정 관리 기능을 구현하고, 앱 전역의 역할 기반 접근 제어를 일관되게 마무리한다.

**완료 기준**: super_admin이 사용자 역할 변경·계정 비활성화를 수행할 수 있고, 모든 페이지·메뉴·DB 접근이 역할 정책에 따라 정확히 통제된다.

- [ ] **TASK-018: 사용자 관리 기능 구현** (F022, F023, F024) - 우선순위
  - [ ] 사용자 계정 목록 테이블 — 이름, 이메일, 역할, 가입일, 활성 상태 (F022)
  - [ ] 역할 변경 드롭다운 — editor ↔ content_admin 변경 (F023)
  - [ ] 계정 비활성화/삭제 확인 모달 (`is_active` 토글) (F024)
  - [ ] 페이지 접근 제어: super_admin만
  - [ ] **테스트 체크리스트**: 역할 변경 후 권한 즉시 반영, 비활성 계정 로그인 차단 (Playwright MCP)

- [ ] **TASK-019: RBAC 통합 및 권한 일관성 검증** (F001~F024)
  - [ ] 사이드바 메뉴의 역할별 조건부 렌더링 일괄 점검 (조직도/회사소개/동영상/이미지: content_admin↑, 사용자관리: super_admin)
  - [ ] 라우트 가드와 RLS 정책 간 정합성 검증 (UI 차단 ≠ DB 차단 불일치 제거)
  - [ ] editor 본인 콘텐츠 한정 수정/삭제 규칙 전역 일관성 확인 (뉴스·방문자)
  - [ ] **테스트 체크리스트**: 3개 역할별 전체 페이지 접근 매트릭스 E2E 테스트 (Playwright MCP)

---

### Phase 5: 디스플레이 화면 및 실시간 연동 구현

**목표**: TV/키오스크용 풀스크린 Swiper 슬라이드쇼를 구현하고, Supabase Realtime으로 관리자 변경 사항이 디스플레이에 즉시 반영되게 한다.

**완료 기준**: 6종 슬라이드가 표시 조건에 따라 자동 순환 재생되고, 관리자가 콘텐츠를 변경하면 디스플레이 화면이 새로고침 없이 즉시 갱신된다.

- [ ] **TASK-020: Swiper 슬라이드쇼 기반 구조 구현** (F028) - 우선순위
  - [ ] Swiper v11 설치 및 풀스크린 자동재생 슬라이드쇼 골격 (`vw` 고정 레이아웃, 비반응형)
  - [ ] 슬라이드 순서/표시 조건 제어 로직 (조직도→뉴스→방문자→회사소개→이미지→동영상)
  - [ ] 무한 루프 자동재생 및 슬라이드별 표시 시간 설정
  - [ ] **테스트 체크리스트**: 슬라이드 순환, 빈 데이터 시 해당 슬라이드 스킵 (Playwright MCP)

- [ ] **TASK-021: 조직도 슬라이드 구현** (F029)
  - [ ] `divisions`/`teams`/`employees` 데이터 기반 동적 렌더링 (실/팀/직원 계층 구조)
  - [ ] 파견/퇴사 직원 표시 제외 처리, display_order 정렬
  - [ ] 항상 표시 (표시 조건 없음)

- [ ] **TASK-022: 뉴스·방문자 슬라이드 구현** (F030, F031)
  - [ ] 뉴스 슬라이드 — 활성 뉴스(is_active=true) 순환 표시 (F030)
  - [ ] 방문자 슬라이드 — 게시 스케줄(scheduled_start/end_at) 기반 활성 방문자 표시 (F031)
  - [ ] 활성 콘텐츠 1건 이상일 때만 슬라이드 표시
  - [ ] **테스트 체크리스트**: 게시 스케줄 만료 콘텐츠 미표시, 활성 콘텐츠 순환 (Playwright MCP)

- [ ] **TASK-023: 회사소개·이미지·동영상 슬라이드 구현** (F032, F033, F034)
  - [ ] 회사소개 슬라이드 — `is_enabled=true`일 때만 표시, SafeInsight + In-Guide 하드코딩 HTML (F032)
  - [ ] 이미지 슬라이드 — 활성 이미지 순환 표시 (F033)
  - [ ] 동영상 슬라이드 — 활성 동영상 풀스크린 자동재생 (F034)
  - [ ] **테스트 체크리스트**: 회사소개 on/off 연동, 동영상 풀스크린 자동재생, 이미지 순환 (Playwright MCP)

- [ ] **TASK-024: Supabase Realtime 실시간 연동 구현** (F035) - 핵심 기능
  - [ ] 디스플레이 화면에서 6개 콘텐츠 테이블 Realtime 구독 설정
  - [ ] 관리자 변경(INSERT/UPDATE/DELETE) 발생 시 해당 슬라이드 즉시 갱신 (새로고침 불필요)
  - [ ] 구독 재연결/네트워크 단절 복구 처리
  - [ ] 회사소개 on/off, 직원 상태 변경 등 단일 행 변경 실시간 반영
  - [ ] **테스트 체크리스트**: 관리자 콘텐츠 등록/수정/삭제 → 디스플레이 즉시 반영 E2E, 연결 끊김 복구 (Playwright MCP)

---

### Phase 6: 품질 보증, 최적화 및 배포

**목표**: 반응형 UI·성능·안정성을 마무리하고 Vercel 배포 파이프라인을 구축한다.

**완료 기준**: 관리자 앱이 PC/태블릿/모바일 브레이크포인트에서 정상 동작하고, 전체 사용자 플로우 E2E 테스트를 통과하며, Vercel 프로덕션 배포가 완료된다.

- [ ] **TASK-025: 반응형 UI 및 접근성 마무리** (F002~F024)
  - [ ] PC(1025px↑) 고정 사이드바 + 넓은 테이블 레이아웃 검증
  - [ ] 태블릿(769~1024px) 접이식 사이드바(아이콘) 검증
  - [ ] 모바일(~768px) 햄버거 메뉴 + 테이블→카드형 전환 검증
  - [ ] 다크모드/라이트모드 전 페이지 일관성 점검
  - [ ] **테스트 체크리스트**: 3개 브레이크포인트별 주요 페이지 레이아웃 검증 (Playwright MCP viewport)

- [ ] **TASK-026: 전체 통합 E2E 테스트 및 엣지 케이스 검증** (F001~F035)
  - [ ] 회원가입→인증→로그인→콘텐츠 등록→디스플레이 반영 전 플로우 E2E (Playwright MCP)
  - [ ] 역할별 접근 매트릭스 통합 검증
  - [ ] 에러 핸들링(네트워크 오류, 업로드 실패, 빈 데이터, 권한 오류) 엣지 케이스
  - [ ] Realtime 동시성 및 다중 클라이언트 시나리오 검증

- [ ] **TASK-027: 성능 최적화** (F028~F035)
  - [ ] 디스플레이 화면 장시간 구동(메모리 누수, Realtime 구독 정리) 최적화
  - [ ] 이미지/동영상 로딩 최적화 (next/image, 프리로드, 캐싱)
  - [ ] TanStack Query 캐싱 전략 및 staleTime 튜닝
  - [ ] 번들 사이즈 및 초기 로딩 성능 점검

- [ ] **TASK-028: Vercel 배포 및 운영 환경 구성**
  - [ ] Vercel 프로젝트 연결 및 환경 변수(Supabase 키) 설정
  - [ ] Supabase 프로덕션 인스턴스 마이그레이션 및 Storage 버킷 구성
  - [ ] Supabase Auth 이메일 인증 콜백 URL 설정 — Supabase 대시보드 > Authentication > URL Configuration > Redirect URLs에 `https://your-domain.com/admin/auth/callback` 추가 (개발 환경: `http://localhost:3000/admin/auth/callback`은 이미 추가 필요)
  - [ ] 프로덕션 빌드 검증 및 배포, 디스플레이 화면 키오스크 URL 고정 가이드

---

## PRD 기능 ID 커버리지 매핑

| 영역 | 기능 ID | 담당 Task |
|------|---------|----------|
| 인증 | F001 (로그인) | TASK-006, TASK-009 |
| 인증 | F026 (회원가입) | TASK-007 |
| 인증 | F027 (이메일 인증 완료) | TASK-008 |
| 대시보드 | F002 | TASK-010 |
| 조직도 | F003, F004, F005, F006 (직원) | TASK-012 |
| 조직도 | F007 (실), F008 (팀) | TASK-011 |
| 뉴스 | F009, F010, F011, F012 | TASK-013 |
| 방문자 | F013, F014, F015, F016 | TASK-014 |
| 회사소개 | F017 | TASK-015 |
| 동영상 | F018, F019 | TASK-016 |
| 이미지 | F020, F021 | TASK-017 |
| 사용자 관리 | F022, F023, F024 | TASK-018 |
| (결번) | **F025** | — (예약된 ID 없음) |
| 디스플레이 | F028 (슬라이드쇼) | TASK-020 |
| 디스플레이 | F029 (조직도) | TASK-021 |
| 디스플레이 | F030 (뉴스), F031 (방문자) | TASK-022 |
| 디스플레이 | F032 (회사소개), F033 (이미지), F034 (동영상) | TASK-023 |
| 디스플레이 | F035 (Realtime) | TASK-024 |

> **커버리지 확인**: F001~F024(F025 결번 제외) + F026~F035 = 총 34개 기능이 모두 Task에 매핑되었습니다.
