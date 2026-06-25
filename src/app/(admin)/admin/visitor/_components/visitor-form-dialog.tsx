'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { visitorSchema, type VisitorFormValues } from '@/lib/validations/visitor'
import { toast } from 'sonner'
import { LoadingButton } from '@/components/composite/loading-button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { VisitorContent } from '@/types'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function insertVisitor(values: VisitorFormValues): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증 정보가 없습니다.')

  const { error } = await supabase
    .from('visitor_contents')
    .insert({
      title: values.title,
      visitor_org: values.visitor_org,
      visitor_name: values.visitor_name,
      visitor_title: values.visitor_title,
      location: values.location,
      scheduled_start_at: values.scheduled_start_at || null,
      scheduled_end_at: values.scheduled_end_at || null,
      is_active: values.is_active,
      created_by: user.id,
    })
  if (error) throw error
}

async function updateVisitor(id: string, values: VisitorFormValues): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('visitor_contents')
    .update({
      title: values.title,
      visitor_org: values.visitor_org,
      visitor_name: values.visitor_name,
      visitor_title: values.visitor_title,
      location: values.location,
      scheduled_start_at: values.scheduled_start_at || null,
      scheduled_end_at: values.scheduled_end_at || null,
      is_active: values.is_active,
    })
    .eq('id', id)
  if (error) throw error
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VisitorFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitor?: VisitorContent | null
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function VisitorFormDialog({ open, onOpenChange, visitor }: VisitorFormDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = !!visitor

  const form = useForm<VisitorFormValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: {
      title: '',
      visitor_org: '',
      visitor_name: '',
      visitor_title: '',
      location: '',
      scheduled_start_at: null,
      scheduled_end_at: null,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: visitor?.title ?? '',
        visitor_org: visitor?.visitor_org ?? '',
        visitor_name: visitor?.visitor_name ?? '',
        visitor_title: visitor?.visitor_title ?? '',
        location: visitor?.location ?? '',
        scheduled_start_at: toDatetimeLocal(visitor?.scheduled_start_at),
        scheduled_end_at: toDatetimeLocal(visitor?.scheduled_end_at),
        is_active: visitor?.is_active ?? true,
      })
    }
  }, [open, visitor, form])

  const insertMutation = useMutation({
    mutationFn: insertVisitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() })
      toast.success('방문자 공지가 등록되었습니다.')
      onOpenChange(false)
    },
    onError: () => toast.error('방문자 공지 등록에 실패했습니다.'),
  })

  const updateMutation = useMutation({
    mutationFn: (values: VisitorFormValues) => updateVisitor(visitor!.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() })
      toast.success('방문자 공지가 수정되었습니다.')
      onOpenChange(false)
    },
    onError: () => toast.error('방문자 공지 수정에 실패했습니다.'),
  })

  const isPending = insertMutation.isPending || updateMutation.isPending

  function onSubmit(values: VisitorFormValues) {
    if (isEdit) {
      updateMutation.mutate(values)
    } else {
      insertMutation.mutate(values)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '방문자 공지 수정' : '방문자 공지 등록'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>방문 목적 / 제목</FormLabel>
                  <FormControl>
                    <Input placeholder="예) 본사 방문을 환영합니다" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visitor_org"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>방문 기관 / 기업명</FormLabel>
                  <FormControl>
                    <Input placeholder="예) 휴빌론 코리아" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="visitor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>방문자 이름</FormLabel>
                    <FormControl>
                      <Input placeholder="예) 홍길동" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visitor_title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>방문자 직책</FormLabel>
                    <FormControl>
                      <Input placeholder="예) 대표이사" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>방문 장소</FormLabel>
                  <FormControl>
                    <Input placeholder="예) 2층 중회의실" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_start_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>게시 시작 일시</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduled_end_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>게시 종료 일시</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>활성 상태</FormLabel>
                    <p className="text-[0.8rem] text-muted-foreground">
                      활성화 시 디스플레이 화면에 노출됩니다.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="활성 상태 토글"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <LoadingButton
                type="submit"
                isPending={isPending}
                className="w-full sm:w-auto"
              >
                {isEdit ? '수정 완료' : '등록 완료'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
