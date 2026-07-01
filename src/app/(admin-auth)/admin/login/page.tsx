'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { loginSchema, type LoginFormValues } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError } from '@/lib/supabase/auth-errors'
import { useAuthStore } from '@/store/auth-store'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { LoadingButton } from '@/components/composite/loading-button'

export default function LoginPage() {
  const searchParams = useSearchParams()
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    if (searchParams.get('error') === 'auth_callback_error') {
      toast.error('인증 링크 오류', { description: '유효하지 않거나 만료된 링크입니다. 다시 시도해주세요' })
    }
  }, [searchParams])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues) {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error || !data.user) {
      toast.error('로그인 실패', {
        description: error ? mapAuthError(error) : '로그인 중 오류가 발생했습니다',
      })
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      await supabase.auth.signOut()
      toast.error('로그인 실패', {
        description: '계정 정보를 불러올 수 없습니다. 다시 시도해주세요',
      })
      return
    }

    if (!profile.is_active) {
      await supabase.auth.signOut()
      toast.error('로그인 실패', {
        description: '관리자 승인 대기 중인 계정입니다. 승인 후 로그인이 가능합니다.',
      })
      return
    }

    setUser(profile)
    toast.success('로그인 성공', { description: `${profile.name}님, 환영합니다` })

    // 브라우저 Supabase 클라이언트가 document.cookie로 세션을 기록한 직후,
    // router.push()의 클라이언트 사이드(RSC) 네비게이션을 사용하면
    // 프록시(구 middleware)가 이 요청을 처리하는 시점에 방금 쓰여진 쿠키가
    // 아직 반영되지 않을 수 있음 — 로컬은 지연이 거의 없어 재현되지 않지만,
    // Vercel 엣지 환경의 실제 네트워크 왕복 지연에서는 이 쿠키 커밋 타이밍과
    // 경쟁하면서 프록시가 미인증으로 판단해 /admin/login으로 되돌리는
    // 간헐적 리다이렉트 실패가 발생한다.
    // 완전한 브라우저 네비게이션을 강제하면 새 요청이 항상 Cookie 헤더를 통해
    // 최신 세션을 서버로 전달하므로 이 경쟁을 원천 차단한다.
    // (location.href = ... 대신 location.assign을 사용 — react-hooks/immutability
    // 규칙이 외부 값에 대한 대입 표현식을 금지하므로 함수 호출 형태로 작성)
    window.location.assign('/admin/dashboard')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">관리자 로그인</h1>
        <p className="text-sm text-muted-foreground">
          이메일과 비밀번호를 입력해주세요
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이메일</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <LoadingButton
            type="submit"
            className="w-full"
            isPending={form.formState.isSubmitting}
            pendingText="로그인 중..."
          >
            로그인
          </LoadingButton>
        </form>
      </Form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          또는
        </span>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        계정이 없으신가요?{' '}
        <Link href="/admin/register" className="font-medium text-foreground hover:underline">
          회원가입
        </Link>
      </p>
    </div>
  )
}
