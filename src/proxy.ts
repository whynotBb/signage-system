import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 라우트 가드: /admin/** 경로에만 적용
export const config = {
  matcher: ['/admin/:path*'],
}

// 공개 접근 허용 경로 (인증 불필요)
const PUBLIC_AUTH_PATHS = [
  '/admin/login',
  '/admin/register',
  '/admin/auth/callback',
]

// 역할 기반 보호 경로 — 허용 역할 외 접근 시 /admin/dashboard로 리다이렉트
const ROLE_GUARDS: { prefix: string; allowed: string[] }[] = [
  { prefix: '/admin/users', allowed: ['super_admin'] },
  { prefix: '/admin/org', allowed: ['super_admin', 'content_admin'] },
  { prefix: '/admin/company-intro', allowed: ['super_admin', 'content_admin'] },
  { prefix: '/admin/video', allowed: ['super_admin', 'content_admin'] },
  { prefix: '/admin/image', allowed: ['super_admin', 'content_admin'] },
]

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  // Supabase SSR 클라이언트 생성 (쿠키 기반)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 요청 쿠키 업데이트
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // 응답 재생성 후 쿠키 설정
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() 대신 getUser() 사용 (보안: 서버 측 토큰 검증)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // 현재 경로가 공개 경로인지 확인
  const isPublic = PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p))

  // 비로그인 상태에서 보호 경로 접근 시 로그인 페이지로 리다이렉트
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  // 역할 기반 접근 제어 — 보호 경로 진입 시에만 DB 조회
  if (user) {
    const matchedGuard = ROLE_GUARDS.find((g) => pathname.startsWith(g.prefix))
    if (matchedGuard) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || !matchedGuard.allowed.includes(profile.role)) {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return response
}
