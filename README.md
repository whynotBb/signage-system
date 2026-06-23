# 사이니지 관리 시스템

하드코딩으로 운영되던 사이니지 콘텐츠를 비개발자도 웹 인터페이스로 자율 편집하고, 변경 사항이 Supabase Realtime을 통해 디스플레이 화면에 즉시 반영되도록 하는 관리 시스템입니다.

## 🎯 프로젝트 개요

**목적**: 하드코딩으로 운영되던 사이니지 콘텐츠를 비개발자도 웹 인터페이스로 자율 편집하고, 변경 사항이 실시간으로 디스플레이 화면에 반영되도록 합니다.

**범위**:
- `/admin` — 사이니지 콘텐츠를 관리하는 웹 관리자 앱 (PC~모바일 반응형)
- `/` — 실제 TV/키오스크에 출력되는 사이니지 디스플레이 화면 (풀스크린, 비반응형)

**사용자**: 회사 내부 운영 담당자 — 슈퍼어드민, 콘텐츠어드민, 편집자 3개 역할로 구분

| 역할 | 권한 |
|------|------|
| 슈퍼어드민 (`super_admin`) | 전체 권한 + 사용자 역할 변경/계정 비활성화 |
| 콘텐츠어드민 (`content_admin`) | 모든 콘텐츠 등록/수정/삭제 |
| 편집자 (`editor`) | 뉴스·방문자 등록 + 본인 등록 콘텐츠만 수정/삭제 |

## 📱 주요 페이지

### 공개 화면

1. **디스플레이 화면** (`/`) — Swiper v11 풀스크린 자동재생 슬라이드쇼. 관리자 변경 사항을 Supabase Realtime으로 즉시 반영

### 인증

2. **로그인** (`/admin/login`) — 이메일/비밀번호 인증 (Supabase Auth)
3. **회원가입** (`/admin/register`) — 회사 이메일 가입, 최초 편집자 권한 자동 부여, 이메일 인증 흐름
4. **이메일 인증 완료** — 인증 메일 링크 클릭 시 가입 완료 처리

### 관리자 앱 (`/admin`)

5. **대시보드** (`/admin/dashboard`) — 콘텐츠 카테고리별 활성 건수 요약 현황
6. **조직도 관리** (`/admin/org`) — 실(Division)/팀(Team)/직원 CRUD, 프로필 사진 업로드 _(super_admin, content_admin)_
7. **뉴스 관리** (`/admin/news`) — 뉴스 등록/수정/삭제, 게시 스케줄 설정 _(전 역할, editor는 본인 것만)_
8. **방문자 관리** (`/admin/visitor`) — 방문자 등록/수정/삭제, 게시 스케줄 설정 _(전 역할, editor는 본인 것만)_
9. **회사소개 관리** (`/admin/company-intro`) — SafeInsight·In-Guide 슬라이드 on/off 토글 _(super_admin, content_admin)_
10. **동영상 관리** (`/admin/video`) — 풀스크린 동영상 파일 업로드/삭제 _(super_admin, content_admin)_
11. **이미지 관리** (`/admin/image`) — 이미지 파일 업로드/삭제 _(super_admin, content_admin)_
12. **사용자 관리** (`/admin/users`) — 사용자 역할 변경, 계정 비활성화/삭제 _(super_admin만)_

## ⚡ 핵심 기능

- **실시간 사이니지**: Supabase Realtime 구독으로 관리자 변경 사항을 디스플레이에 즉시 반영 (새로고침 불필요)
- **풀스크린 슬라이드쇼**: Swiper v11 기반, 조직도·뉴스·방문자·회사소개·이미지·동영상 순환 재생
- **역할 기반 접근 제어**: 3단계 역할 체계로 메뉴·데이터 접근 권한 분리
- **이메일 인증 회원가입**: 회사 이메일 가입 후 인증 완료 시 편집자 권한 자동 부여
- **조직도 계층 관리**: 실 → 팀 → 직원 3계층 구조 CRUD + Supabase Storage 프로필 사진
- **콘텐츠 게시 스케줄**: 뉴스·방문자 시작/종료 일시 설정으로 자동 활성화/비활성화
- **파일 관리**: Supabase Storage 기반 동영상·이미지·직원 프로필 사진 업로드
- **반응형 관리자 UI**: 모바일(햄버거 메뉴)~태블릿~PC 전 구간 대응

## 🛠️ 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 16.2.9 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Runtime | React 19.2.4 |
| Styling | TailwindCSS 4 + shadcn/ui + Lucide React |
| 폼·검증 | react-hook-form 7 + Zod 4 |
| 서버 데이터 | TanStack Query 5 |
| 클라이언트 상태 | Zustand 5 (persist 미들웨어) |
| Backend | Supabase (Auth · PostgreSQL · Storage · Realtime) |
| 슬라이드쇼 | Swiper v11 |
| 배포 | Vercel |

## 🚀 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행 (localhost:3000)
npm run dev

# 프로덕션 빌드
npm run build

# 린트
npm run lint
```

환경 변수 설정 (`.env.local`):

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 📋 개발 상태

- ✅ 기본 프로젝트 구조 설정 (라우트 그룹, 레이아웃, 컴포넌트 레이어)
- ✅ 역할 기반 사이드바 네비게이션 (권한별 메뉴 필터링·그룹핑)
- ✅ 인증 스토어 (Zustand persist, localStorage)
- ✅ 관리자 페이지 스캐폴딩 (8개 페이지 기본 구조)
- 🔄 Supabase 연동 및 실제 데이터 구현
- ⏳ 디스플레이 화면 슬라이드쇼 (Swiper v11, Realtime)
- ⏳ 조직도 관리 (직원·실·팀 CRUD, 프로필 사진 업로드)
- ⏳ 뉴스·방문자 관리 (CRUD, 게시 스케줄)
- ⏳ 동영상·이미지 관리 (Supabase Storage 연동)
- ⏳ 회사소개 on/off 관리
- ⏳ 사용자 관리 (역할 변경, 비활성화)
- ⏳ 로그인·회원가입·이메일 인증 구현

## 📖 문서

- [PRD 문서](./docs/PRD.md) — 상세 요구사항 (기능 명세, 데이터 모델, 페이지별 상세)
- [개발 가이드](./CLAUDE.md) — 개발 지침 및 Next.js 16 주의사항
