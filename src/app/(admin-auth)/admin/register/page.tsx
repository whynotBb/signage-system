'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { registerSchema, type RegisterFormValues } from '@/lib/validations/auth'
import { createClient } from '@/lib/supabase/client'
import { mapAuthError } from '@/lib/supabase/auth-errors'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { LoadingButton } from '@/components/composite/loading-button'

export default function RegisterPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit(values: RegisterFormValues) {
    const supabase = createClient()

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { name: values.name },
      },
    })

    if (error) {
      toast.error('회원가입 실패', { description: mapAuthError(error) })
      return
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: values.email,
        name: values.name,
        is_active: false,
        role: 'editor',
      })
    }

    setSubmittedEmail(values.email)
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Clock className="h-8 w-8 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">가입 신청이 완료되었습니다</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{submittedEmail}</span>으로
            가입 신청이 접수되었습니다.
          </p>
          <p className="text-sm text-muted-foreground">
            관리자 승인 후 로그인이 가능합니다.
          </p>
        </div>
        <Link
          href="/admin/login"
          className="inline-block text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
        <p className="text-sm text-muted-foreground">
          아래 정보를 입력하여 관리자 계정을 만드세요
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input placeholder="홍길동" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                <FormDescription>
                  8자 이상, 대문자 및 숫자를 포함해야 합니다
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>비밀번호 확인</FormLabel>
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
            pendingText="가입 중..."
          >
            회원가입
          </LoadingButton>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{' '}
        <Link href="/admin/login" className="font-medium text-foreground hover:underline">
          로그인
        </Link>
      </p>
    </div>
  )
}
