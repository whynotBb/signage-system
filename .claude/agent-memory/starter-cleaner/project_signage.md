---
name: project-signage-init
description: 사이니지 관리 시스템 초기화 완료 상태 — 라우팅 구조, 삭제된 파일, 주요 결정 사항
metadata:
  type: project
---

사이니지 관리 시스템 스타터킷 초기화 완료 (2026-06-23).

**Why:** 스타터킷의 데모 콘텐츠를 제거하고 `/admin/*` 경로 기반의 관리자 시스템으로 재편. 디스플레이 화면(`/`)과 관리자 영역(`/admin/*`)을 분리.

**How to apply:** 이미 초기화 완료된 상태이므로 추가 스캐폴딩 작업 불필요. 기능 구현 단계로 진입 가능.

## 라우팅 구조 (확정)

- `/` → `src/app/page.tsx` (풀스크린 디스플레이, 로그인 불필요)
- `/admin/dashboard` → `src/app/(admin)/admin/dashboard/page.tsx`
- `/admin/org` → `src/app/(admin)/admin/org/page.tsx`
- `/admin/news` → `src/app/(admin)/admin/news/page.tsx`
- `/admin/visitor` → `src/app/(admin)/admin/visitor/page.tsx`
- `/admin/company-intro` → `src/app/(admin)/admin/company-intro/page.tsx`
- `/admin/video` → `src/app/(admin)/admin/video/page.tsx`
- `/admin/image` → `src/app/(admin)/admin/image/page.tsx`
- `/admin/users` → `src/app/(admin)/admin/users/page.tsx`
- `/admin/login` → `src/app/(admin-auth)/admin/login/page.tsx`
- `/admin/register` → `src/app/(admin-auth)/admin/register/page.tsx`

## 라우트 그룹 구조

- `(admin)` — Sidebar + Header 레이아웃 (`src/app/(admin)/layout.tsx`)
- `(admin-auth)` — 인증 카드 레이아웃 (`src/app/(admin-auth)/layout.tsx`)

## 삭제된 파일 (재생성 불필요)

- `src/app/(landing)/` — 스타터킷 랜딩 페이지
- `src/app/(dashboard)/` — 구 대시보드 라우트 그룹 (→ (admin)으로 교체)
- `src/app/(auth)/` — 구 인증 라우트 그룹 (→ (admin-auth)로 교체)
- `src/components/layout/header.tsx` — 랜딩 헤더 (LANDING_NAV_ITEMS 소비)
- `src/components/layout/footer.tsx` — 랜딩 푸터
- `src/lib/validations/settings.ts` — 일반 설정 스키마

## 타입 구조

- `UserRole` = `'super_admin' | 'content_admin' | 'editor'` (types/index.ts)
- `NavIconKey` = 8개 아이콘 (LayoutDashboard, Users, Newspaper, UserCheck, Building2, Video, Image, Shield)
- `NavItem`에 `group?`, `roles?` 필드 추가

## 주의 사항

- `nav-link.tsx`의 `iconMap`은 `NavIconKey` 유니온과 완전히 일치해야 함 (Record<NavIconKey, LucideIcon>)
- `LANDING_NAV_ITEMS`는 삭제됨 — constants.ts에서 참조 불가
- Supabase Auth 연동 시 auth-store의 User.role 필드 활용
