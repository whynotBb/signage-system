'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { divisionSchema, type DivisionFormValues } from '@/lib/validations/org'
import { useAuthStore } from '@/store/auth-store'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import { LoadingButton } from '@/components/composite/loading-button'
import { EmptyState } from '@/components/composite/empty-state'
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
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Division } from '@/types'

// ── Supabase 쿼리 함수 ────────────────────────────────────────────────────────

/** 실 목록을 display_order 오름차순으로 조회 */
async function fetchDivisions(): Promise<Division[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 실 생성 */
async function insertDivision(values: DivisionFormValues): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('divisions').insert(values)
  if (error) throw error
}

/** 실 수정 */
async function updateDivision({
  id,
  values,
}: {
  id: string
  values: DivisionFormValues
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('divisions').update(values).eq('id', id)
  if (error) throw error
}

/** 실 삭제 (소속 팀은 CASCADE로 함께 삭제) */
async function deleteDivision(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('divisions').delete().eq('id', id)
  if (error) throw error
}

// ── DivisionFormDialog ────────────────────────────────────────────────────────

interface DivisionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: DivisionFormValues & { id: string }
  onSubmit: (values: DivisionFormValues) => Promise<void>
  isPending: boolean
}

/** 실 생성/수정 다이얼로그 */
function DivisionFormDialog({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
  isPending,
}: DivisionFormDialogProps) {
  const form = useForm<DivisionFormValues>({
    resolver: zodResolver(divisionSchema),
    defaultValues: defaultValues ?? { name: '', display_order: 1 },
  })

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values)
    form.reset()
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues ? '실 수정' : '실 추가'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>실 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 영업실" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="display_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>표시 순서</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <LoadingButton type="submit" isPending={isPending}>
                {defaultValues ? '수정' : '추가'}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

// ── DivisionSection ───────────────────────────────────────────────────────────

/** 조직도 관리 — 실(Division) 목록 및 CRUD */
export function DivisionSection() {
  // 역할 기반 편집 권한: super_admin, content_admin만 CRUD 가능
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'super_admin' || role === 'content_admin'
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<
    (DivisionFormValues & { id: string }) | null
  >(null)

  // 실 목록 조회
  const { data: divisions, isLoading } = useQuery({
    queryKey: queryKeys.divisions.all,
    queryFn: fetchDivisions,
  })

  // divisions.all + teams.all 동시 무효화 (실 삭제 시 팀 목록도 갱신)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
  }

  const insertMutation = useMutation({
    mutationFn: insertDivision,
    onSuccess: invalidate,
  })
  const updateMutation = useMutation({
    mutationFn: updateDivision,
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: deleteDivision,
    onSuccess: invalidate,
  })

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">실(Division) 관리</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            실 추가
          </Button>
        )}
      </div>

      {/* 로딩 스켈레톤 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : !divisions?.length ? (
        // 빈 상태
        <EmptyState
          title="등록된 실이 없습니다"
          description="실 추가 버튼을 눌러 첫 번째 실을 등록하세요."
        />
      ) : (
        // 실 목록 테이블
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="w-20 px-4 py-2 text-left font-medium">순서</th>
                <th className="px-4 py-2 text-left font-medium">실 이름</th>
                {canEdit && (
                  <th className="w-28 px-4 py-2 text-right font-medium">
                    액션
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {divisions.map((div) => (
                <tr
                  key={div.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2 text-muted-foreground">
                    {div.display_order}
                  </td>
                  <td className="px-4 py-2 font-medium">{div.name}</td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {/* 수정 버튼 */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditTarget({
                              id: div.id,
                              name: div.name,
                              display_order: div.display_order,
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* 삭제 버튼 — ConfirmDialog로 이중 확인 */}
                        <ConfirmDialog
                          trigger={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title="실 삭제"
                          description={`'${div.name}'을(를) 삭제하시겠습니까? 소속 팀도 함께 삭제됩니다.`}
                          confirmLabel="삭제"
                          variant="destructive"
                          onConfirm={() => deleteMutation.mutate(div.id)}
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 실 생성 다이얼로그 */}
      <DivisionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => insertMutation.mutateAsync(values)}
        isPending={insertMutation.isPending}
      />

      {/* 실 수정 다이얼로그 */}
      {editTarget && (
        <DivisionFormDialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          defaultValues={editTarget}
          onSubmit={(values) =>
            updateMutation.mutateAsync({ id: editTarget.id, values })
          }
          isPending={updateMutation.isPending}
        />
      )}
    </section>
  )
}
