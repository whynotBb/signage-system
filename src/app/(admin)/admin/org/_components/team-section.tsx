'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { teamSchema, type TeamFormValues } from '@/lib/validations/org'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Division, Team } from '@/types'

// ── Supabase 쿼리 함수 ────────────────────────────────────────────────────────

/** 팀 목록을 display_order 오름차순으로 조회 */
async function fetchTeams(): Promise<Team[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Select 드롭다운용 실 목록 조회 */
async function fetchDivisionsForSelect(): Promise<Division[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** 팀 생성 */
async function insertTeam(values: TeamFormValues): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('teams').insert(values)
  if (error) throw error
}

/** 팀 수정 */
async function updateTeam({
  id,
  values,
}: {
  id: string
  values: TeamFormValues
}): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('teams').update(values).eq('id', id)
  if (error) throw error
}

/** 팀 삭제 */
async function deleteTeam(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) throw error
}

// ── TeamFormDialog ────────────────────────────────────────────────────────────

interface TeamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  divisions: Division[]
  defaultValues?: TeamFormValues & { id: string }
  onSubmit: (values: TeamFormValues) => Promise<void>
  isPending: boolean
}

/** 팀 생성/수정 다이얼로그 */
function TeamFormDialog({
  open,
  onOpenChange,
  divisions,
  defaultValues,
  onSubmit,
  isPending,
}: TeamFormDialogProps) {
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: defaultValues ?? {
      name: '',
      division_id: '',
      display_order: 1,
    },
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
          <DialogTitle>{defaultValues ? '팀 수정' : '팀 추가'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 소속 실 선택 */}
            <FormField
              control={form.control}
              name="division_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소속 실</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="실을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 팀 이름 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>팀 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="예: 영업1팀" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 표시 순서 */}
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

// ── TeamSection ───────────────────────────────────────────────────────────────

/** 조직도 관리 — 팀(Team) 목록 및 CRUD */
export function TeamSection() {
  // 역할 기반 편집 권한: super_admin, content_admin만 CRUD 가능
  const role = useAuthStore((s) => s.user?.role)
  const canEdit = role === 'super_admin' || role === 'content_admin'
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<
    (TeamFormValues & { id: string }) | null
  >(null)

  // Select 드롭다운용 실 목록 (divisions.all 캐시 공유)
  const { data: divisions = [] } = useQuery({
    queryKey: queryKeys.divisions.all,
    queryFn: fetchDivisionsForSelect,
  })

  // 팀 목록 조회
  const { data: teams, isLoading } = useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: fetchTeams,
  })

  /** division_id로 실 이름 조회 */
  const getDivisionName = (divisionId: string | null) =>
    divisions.find((d) => d.id === divisionId)?.name ?? '미배정'

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })

  const insertMutation = useMutation({
    mutationFn: insertTeam,
    onSuccess: invalidate,
  })
  const updateMutation = useMutation({
    mutationFn: updateTeam,
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTeam,
    onSuccess: invalidate,
  })

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">팀(Team) 관리</h2>
        {canEdit && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            팀 추가
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
      ) : !teams?.length ? (
        // 빈 상태
        <EmptyState
          title="등록된 팀이 없습니다"
          description="팀 추가 버튼을 눌러 첫 번째 팀을 등록하세요."
        />
      ) : (
        // 팀 목록 테이블
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">소속 실</th>
                <th className="w-20 px-4 py-2 text-left font-medium">순서</th>
                <th className="px-4 py-2 text-left font-medium">팀 이름</th>
                {canEdit && (
                  <th className="w-28 px-4 py-2 text-right font-medium">
                    액션
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr
                  key={team.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2 text-muted-foreground">
                    {getDivisionName(team.division_id)}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {team.display_order}
                  </td>
                  <td className="px-4 py-2 font-medium">{team.name}</td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        {/* 수정 버튼 */}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditTarget({
                              id: team.id,
                              name: team.name,
                              division_id: team.division_id ?? '',
                              display_order: team.display_order,
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
                          title="팀 삭제"
                          description={`'${team.name}'을(를) 삭제하시겠습니까?`}
                          confirmLabel="삭제"
                          variant="destructive"
                          onConfirm={() => deleteMutation.mutate(team.id)}
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

      {/* 팀 생성 다이얼로그 */}
      <TeamFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        divisions={divisions}
        onSubmit={(values) => insertMutation.mutateAsync(values)}
        isPending={insertMutation.isPending}
      />

      {/* 팀 수정 다이얼로그 */}
      {editTarget && (
        <TeamFormDialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null)
          }}
          divisions={divisions}
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
