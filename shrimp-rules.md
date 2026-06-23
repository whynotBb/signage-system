# Development Guidelines — Signage Management System

## Project Overview

- **목적**: 사이니지 콘텐츠를 비개발자가 웹 인터페이스로 편집 → Supabase Realtime으로 디스플레이에 즉시 반영
- **스택**: Next.js 16.2.9 (App Router) · React 19 · TypeScript 5 · TailwindCSS 4 · shadcn/ui · Supabase · TanStack Query 5 · Zustand 5 · Zod 4 · react-hook-form 7 · Swiper v11
- **라우트**: `(admin)/` 관리자 앱 | `(admin-auth)/` 인증 | `/` 디스플레이 화면

---

## Directory Structure

### 파일 생성 위치 규칙

| 파일 종류 | 위치 |
|-----------|------|
| 관리자 페이지 | `src/app/(admin)/admin/{기능명}/page.tsx` |
| 인증 페이지 | `src/app/(admin-auth)/admin/{기능명}/page.tsx` |
| shadcn 컴포넌트 | `npx shadcn add {name}` 명령어 사용 → `src/components/ui/` 자동 배치 |
| 프로젝트 복합 컴포넌트 | `src/components/composite/{name}.tsx` |
| 레이아웃 전용 컴포넌트 | `src/components/layout/{name}.tsx` |
| Provider 컴포넌트 | `src/components/providers/{name}.tsx` |
| Zod 검증 스키마 | `src/lib/validations/{domain}.ts` |
| Zustand 스토어 | `src/store/{name}-store.ts` |
| 공유 타입 정의 | `src/types/index.ts` |
| DB 타입 (Supabase) | `src/types/database.ts` |
| Supabase 클라이언트 | `src/lib/supabase/client.ts` |
| Supabase 서버 클라이언트 | `src/lib/supabase/server.ts` |
| 유틸리티 함수 | `src/lib/utils.ts` (기존) 또는 `src/lib/{name}.ts` |
| 커스텀 훅 | `src/hooks/use-{name}.ts` |
| 경로/상수 | `src/lib/constants.ts` |

### 경로 별칭

- **반드시** `@/` 별칭 사용 (`@/*` → `src/*`)
- ❌ 상대경로(`../`, `./`) 금지 — `src/` 이하 모든 import에서

---

## Next.js 16 Breaking Rules

### 비동기 Request API — **절대 위반 금지**

```tsx
// ❌ 금지 — 런타임 에러 발생
export default function Page({ params }: { params: { id: string } }) {
  const { id } = params
}

// ✅ 필수
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
}
```

- `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` → 전부 `await` 필수
- `npx next typegen` 으로 `PageProps` 타입 자동 생성 가능

### 라우팅 미들웨어

- ❌ `middleware.ts` 파일 생성 금지 (deprecated)
- ✅ `proxy.ts` 파일 + `export function proxy(...)` 사용
- ⚠️ `edge` 런타임은 proxy에서 미지원 — edge 필요 시만 middleware 유지

### 빌드 도구

- ❌ `next.config.js`에 `webpack` 커스텀 설정 금지 (Turbopack 충돌로 빌드 실패)
- ✅ `next dev` / `next build` — Turbopack 자동 사용

### ESLint

- ❌ `next lint` 명령어 금지 (제거됨)
- ✅ `npm run lint` (내부적으로 `eslint` 직접 실행)

### 캐시 API

```ts
// ❌ 금지
revalidateTag('posts')

// ✅ 두 번째 인수 필수
revalidateTag('posts', 'max')
```

- `unstable_cacheLife` / `unstable_cacheTag` → `cacheLife` / `cacheTag` (stable 사용)

### Parallel Routes

- Parallel route 슬롯마다 `default.js` 필수 — 없으면 빌드 실패

### 제거된 설정

- ❌ `serverRuntimeConfig` / `publicRuntimeConfig` 사용 금지 → 환경 변수 직접 사용

---

## Component Rules

### 컴포넌트 레이어 결정 기준

| 레이어 | 폴더 | 기준 |
|--------|------|------|
| UI 기본 | `src/components/ui/` | shadcn/ui Radix 기반, 직접 수정 가능 |
| 복합 | `src/components/composite/` | 프로젝트 전용 재사용 컴포넌트 (≥2곳 이상 사용) |
| 레이아웃 | `src/components/layout/` | 레이아웃에만 사용되는 컴포넌트 |
| Provider | `src/components/providers/` | Context Provider 래퍼 |

- shadcn 컴포넌트 추가: **반드시** `npx shadcn add {name}` — 직접 파일 생성 금지
- `src/components/ui/` 파일은 직접 수정 허용 (shadcn 철학)
- 1곳에만 사용하는 컴포넌트는 해당 page.tsx와 같은 폴더 또는 composite/에 배치

### 서버/클라이언트 컴포넌트

- 기본은 서버 컴포넌트 — `useState`, `useEffect` 필요 시만 `'use client'` 추가
- Supabase Realtime 구독은 반드시 클라이언트 컴포넌트에서 처리

---

## State Management Rules

### TanStack Query (서버 데이터)

```tsx
// queryKey 형식
useQuery({ queryKey: ['news'], queryFn: fetchNews })
useQuery({ queryKey: ['employees', divisionId], queryFn: ... })

// 뮤테이션 후 캐시 무효화 필수
const mutation = useMutation({
  mutationFn: createNews,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
})
```

- `staleTime: 60_000` / `refetchOnWindowFocus: false` — AppProviders에 전역 설정됨, 개별 쿼리에서 재정의 가능
- 서버 데이터는 TanStack Query로만 관리 — Zustand에 서버 데이터 저장 금지

### Zustand (클라이언트 UI 상태)

- `src/store/ui-store.ts` — 커맨드 팔레트 등 UI 상태
- `src/store/auth-store.ts` — 인증 상태 (localStorage persist)
- 새 스토어는 `create<T>()(...)` 패턴 사용

```ts
// persist 미들웨어 사용 예시 (auth-store 참고)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
```

---

## Form & Validation Rules

```tsx
// 표준 폼 패턴
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { newsSchema, type NewsFormValues } from '@/lib/validations/news'

const form = useForm<NewsFormValues>({
  resolver: zodResolver(newsSchema),
  defaultValues: { title: '', ... },
})
```

- Zod 스키마는 `src/lib/validations/{domain}.ts`에 분리 — 폼 컴포넌트 내 인라인 정의 금지
- 에러 메시지는 **한국어**로 작성 (`z.string().min(1, '제목을 입력하세요')`)
- 폼 UI는 `src/components/ui/form.tsx`(shadcn Form) 컴포넌트 사용
- 버튼 로딩 상태는 `src/components/composite/loading-button.tsx` 사용

---

## Supabase Integration Rules

### 클라이언트 분리

| 상황 | 사용 파일 |
|------|-----------|
| 클라이언트 컴포넌트 / 훅 | `src/lib/supabase/client.ts` (`createBrowserClient`) |
| 서버 컴포넌트 / Server Action | `src/lib/supabase/server.ts` (`createServerClient`) |

### 인증 흐름

- 회원가입 → `supabase.auth.signUp()` → 이메일 인증 링크 클릭 → 콜백 처리 → `profiles` 테이블에 `role: 'editor'` 자동 생성
- 로그인 → `supabase.auth.signInWithPassword()` → auth-store 업데이트
- 인증 가드 → `proxy.ts`로 비로그인 시 `/admin/login` 리디렉션

### 데이터베이스 테이블 목록

| 테이블 | 설명 |
|--------|------|
| `profiles` | 시스템 사용자 (role: super_admin / content_admin / editor) |
| `divisions` | 실(Division) |
| `teams` | 팀 (division_id FK) |
| `employees` | 조직도 직원 (division_id, team_id FK) |
| `news_contents` | 뉴스 (created_by FK → profiles) |
| `visitor_contents` | 방문자 (created_by FK → profiles) |
| `company_intro_config` | 회사소개 on/off 단일 행 |
| `video_contents` | 동영상 (video_url: Supabase Storage) |
| `image_contents` | 이미지 (image_url: Supabase Storage) |

### Storage 버킷 패턴

- 직원 프로필 사진: `employees/` 버킷
- 동영상 파일: `videos/` 버킷
- 이미지 파일: `images/` 버킷

### Realtime 구독 (디스플레이 화면 전용)

```tsx
// src/app/page.tsx (디스플레이 화면)에서만 사용
supabase.channel('realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'news_contents' }, handler).subscribe()
```

### 역할 기반 접근 제어

| 역할 | 접근 가능 페이지 |
|------|----------------|
| `super_admin` | 전체 |
| `content_admin` | 사용자 관리 제외 전체 |
| `editor` | 뉴스·방문자 관리 (본인 등록 건만 수정/삭제) |

---

## Multi-file Coordination

### 새 관리자 페이지 추가 시 — **3개 파일 동시 수정 필수**

1. `src/app/(admin)/admin/{기능명}/page.tsx` — 페이지 생성
2. `src/components/nav-main.tsx` — 사이드바 메뉴 항목 추가
3. `src/components/layout/breadcrumb-nav.tsx` — 경로 → 한국어 라벨 매핑 추가

### 새 Supabase 테이블 타입 추가 시

1. `src/types/database.ts` — DB 타입 정의 추가
2. 관련 `src/lib/validations/{domain}.ts` — Zod 스키마 작성

### 새 공유 타입 추가 시

- `src/types/index.ts`에 추가 — 별도 파일 생성 금지 (타입이 도메인-specific한 DB 타입이 아닌 경우)

### shadcn 컴포넌트 추가 시

- `npx shadcn add {name}` 실행 — src/components/ui/ 자동 배치
- 이후 import는 `@/components/ui/{name}` 사용

### 환경 변수 추가 시

1. `.env.local` — 로컬 값 추가
2. `.env.example` (있는 경우) — 키만 추가 (값 제외)

---

## Styling Rules

### TailwindCSS 4

- 설정 파일(`tailwind.config.js`) 없음 — CSS 파일 내 `@import 'tailwindcss'` 방식
- 테마 커스텀: CSS 변수 방식 사용 (`--color-*`)
- ❌ `tailwind.config.js` 생성 금지

### 다크모드

- `dark:` 접두사 사용 (`next-themes`, storageKey: `'theme'`)
- `suppressHydrationWarning` — `<html>` 태그에 필수 (루트 레이아웃에 이미 적용됨)
- 테마 전환: `src/hooks/use-theme.ts` 또는 `src/components/layout/theme-toggle.tsx`

### 반응형

- **관리자 앱**: 반응형 필수 (PC 1025px+ / 태블릿 769~1024px / 모바일 ~768px)
- **디스플레이 화면(`/`)**: 반응형 불필요 — `vw` 단위 고정 레이아웃 사용

### 폰트

- Pretendard 사용 (`pretendard` 패키지 설치됨)

---

## AI Decision-making Standards

### 컴포넌트 배치 결정 트리

```
새 컴포넌트가 필요한가?
├── shadcn에 있는가? → npx shadcn add 사용
├── 2곳 이상 재사용? → src/components/composite/
├── 레이아웃에만 사용? → src/components/layout/
└── 특정 페이지에만 사용? → 해당 page.tsx 파일 내 또는 같은 폴더
```

### 상태 관리 결정 트리

```
어떤 상태인가?
├── 서버에서 fetch한 데이터 → TanStack Query
├── 전역 UI 상태 (모달, 팔레트) → Zustand ui-store
├── 인증 정보 → Zustand auth-store
└── 폼 내부 상태 → react-hook-form (useState 금지)
```

### 서버/클라이언트 컴포넌트 결정

```
컴포넌트가 필요한 것은?
├── useState / useEffect / 브라우저 API → 'use client'
├── Supabase Realtime → 'use client'
├── 이벤트 핸들러만 → 'use client'
└── 나머지 → 서버 컴포넌트 (기본)
```

---

## Prohibited Actions

- ❌ `params` / `searchParams`를 `await` 없이 동기 접근
- ❌ `middleware.ts` 파일 생성 (proxy.ts 사용)
- ❌ `next.config.js`에 webpack 설정
- ❌ `next lint` 명령어 실행 (eslint 직접 사용)
- ❌ `revalidateTag(tag)` 단일 인수 호출
- ❌ `@/` 대신 상대경로 import
- ❌ shadcn 컴포넌트를 직접 파일로 생성 (npx shadcn add 사용)
- ❌ `tailwind.config.js` 생성
- ❌ 서버 데이터를 Zustand에 저장
- ❌ Zod 스키마를 폼 컴포넌트 내 인라인 정의
- ❌ 에러 메시지를 영어로 작성 (한국어 필수)
- ❌ `serverRuntimeConfig` / `publicRuntimeConfig` 사용
- ❌ 새 관리자 페이지 추가 시 nav-main.tsx + breadcrumb-nav.tsx 미수정
- ❌ 디스플레이 화면(`/`)에 반응형 클래스 적용 (vw 고정 레이아웃)
- ❌ `useState`로 폼 상태 관리 (react-hook-form 사용)
