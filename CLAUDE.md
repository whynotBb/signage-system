# 🤖 Claude Code 개발 지침

**사이니지 관리 시스템**은 하드코딩으로 운영되던 사이니지 콘텐츠를 비개발자도 웹 인터페이스로 자율 편집하고, 변경 사항이 Supabase Realtime을 통해 디스플레이 화면에 즉시 반영되도록 하는 관리 시스템입니다.

📋 상세 프로젝트 요구사항은 @/docs/PRD.md 참조

---

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## 명령어

```bash
npm run dev      # 개발 서버 (Turbopack, localhost:3000)
npm run build    # 프로덕션 빌드 (Turbopack 기본)
npm start        # 프로덕션 서버
npm run lint     # ESLint (eslint 직접 실행 — next lint 제거됨)
```

TypeScript 타입 생성 (async params/searchParams 마이그레이션용):
```bash
npx next typegen
```

## 아키텍처

### 라우트 그룹 구조

```
src/app/
  layout.tsx                          # 루트 레이아웃 (AppProviders, 다크모드 인라인 스크립트)
  page.tsx                            # 디스플레이 화면 (/, 풀스크린 사이니지, 공개)
  (admin)/                            # 관리자 앱 — Sidebar + 헤더 레이아웃 (PC~모바일 반응형)
    layout.tsx                        # Sidebar, MobileNav, BreadcrumbNav, ThemeToggle, UserNav
    admin/
      dashboard/page.tsx              # 대시보드 (/admin/dashboard)
      org/page.tsx                    # 조직도 관리 (/admin/org)
      news/page.tsx                   # 뉴스 관리 (/admin/news)
      visitor/page.tsx                # 방문자 관리 (/admin/visitor)
      company-intro/page.tsx          # 회사소개 관리 (/admin/company-intro)
      video/page.tsx                  # 동영상 관리 (/admin/video)
      image/page.tsx                  # 이미지 관리 (/admin/image)
      users/page.tsx                  # 사용자 관리 (/admin/users, super_admin만)
  (admin-auth)/                       # 인증 — 심플한 카드 레이아웃
    admin/
      login/page.tsx                  # 로그인 (/admin/login)
      register/page.tsx               # 회원가입 (/admin/register)
```

### 컴포넌트 레이어

- `src/components/ui/` — shadcn/ui 기반 Radix 컴포넌트 (직접 수정 가능)
- `src/components/composite/` — 프로젝트 전용 복합 컴포넌트 (LoadingButton, UserNav, PageHeader 등)
- `src/components/layout/` — 레이아웃 전용 컴포넌트 (Sidebar, MobileNav, BreadcrumbNav, ThemeToggle)
- `src/components/providers/` — AppProviders (QueryClient + ThemeProvider + TooltipProvider + Toaster)

### 상태 관리

- **TanStack Query** — 서버 데이터. `AppProviders`에서 `staleTime: 60s`, `refetchOnWindowFocus: false` 설정
- **Zustand** — 클라이언트 UI 상태 (`ui-store`: 커맨드 팔레트 열림/닫힘), 인증 상태 (`auth-store`: persist 미들웨어로 localStorage 저장)

### 폼 처리

react-hook-form + `@hookform/resolvers` + Zod. 스키마는 `src/lib/validations/`에 정의.

### 다크모드

`next-themes`(storageKey: `'theme'`) + 루트 레이아웃의 인라인 스크립트(FOUC 방지). `suppressHydrationWarning`이 `<html>`에 필요.

### 경로 별칭

`@/*` → `src/*`

## Next.js 16 주요 변경 사항

### 비동기 Request API (Breaking)

`cookies()`, `headers()`, `draftMode()`, `params`, `searchParams`는 이제 **무조건 async**. 동기 접근은 제거됨.

```tsx
// ❌ 15 이하
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params
}

// ✅ 16
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
}
```

### middleware → proxy

`middleware.ts`는 deprecated. 새 파일명은 `proxy.ts`, 함수명은 `proxy`. `edge` 런타임은 proxy에서 **미지원** — edge가 필요하면 middleware 유지.

### Turbopack 기본값

`next dev`와 `next build` 모두 Turbopack 사용. webpack 커스텀 설정이 있으면 빌드 실패.

### 캐시 API

```ts
// ❌ 16에서는 두 번째 인수 필수
revalidateTag('posts')

// ✅
revalidateTag('posts', 'max')
```

`unstable_cacheLife` / `unstable_cacheTag` → `cacheLife` / `cacheTag` (stable).

### Parallel Routes

모든 parallel route 슬롯에 명시적 `default.js` 필요. 없으면 빌드 실패.

### ESLint

`next lint` 명령어 제거됨. `eslint`를 직접 사용 (package.json에 이미 반영).

### 기타

- `serverRuntimeConfig` / `publicRuntimeConfig` 제거 → 환경 변수 직접 사용
- `next dev` 출력은 `.next/dev/`에 분리 (빌드와 동시 실행 가능)
- `images.minimumCacheTTL` 기본값: 60초 → 4시간
