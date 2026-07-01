'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { useLogActivity } from '@/hooks/use-log-activity'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Users } from 'lucide-react'
import { ConfirmDialog } from '@/components/composite/confirm-dialog'
import type { Profile, UserRole } from '@/types'

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchProfiles(currentUserId: string): Promise<Profile[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUserId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function UsersTable() {
  const queryClient = useQueryClient()
  const log = useLogActivity()
  const currentUser = useAuthStore((state) => state.user)
  const [tab, setTab] = useState<'all' | 'pending' | 'active'>('all')

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: queryKeys.profiles.all,
    queryFn: () => fetchProfiles(currentUser?.id ?? ''),
    enabled: !!currentUser,
  })

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.pendingCount() })
      toast.success('승인 완료', { description: '계정이 활성화되었습니다.' })
      // 계정 활성화 이력 기록
      const userName = profiles.find((p) => p.id === id)?.name ?? id
      log({ actionType: 'update', targetType: 'user', targetId: id, targetName: userName, description: `사용자 '${userName}' 계정 활성화` })
    },
    onError: () => toast.error('승인 실패', { description: '다시 시도해주세요.' }),
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all })
      toast.success('비활성화 완료', { description: '계정이 비활성화되었습니다.' })
      // 계정 비활성화 이력 기록
      const userName = profiles.find((p) => p.id === id)?.name ?? id
      log({ actionType: 'update', targetType: 'user', targetId: id, targetName: userName, description: `사용자 '${userName}' 계정 비활성화` })
    },
    onError: () => toast.error('비활성화 실패', { description: '다시 시도해주세요.' }),
  })

  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const supabase = createClient()
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { id, role }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all })
      toast.success('역할 변경 완료')
      // 역할 변경 이력 기록
      const userName = profiles.find((p) => p.id === id)?.name ?? id
      log({ actionType: 'update', targetType: 'user', targetId: id, targetName: userName, description: `사용자 '${userName}' 역할 변경 → ${role}` })
    },
    onError: () => toast.error('역할 변경 실패', { description: '다시 시도해주세요.' }),
  })

  const pending = profiles.filter((p) => !p.is_active)
  const active = profiles.filter((p) => p.is_active)
  const displayList = tab === 'pending' ? pending : tab === 'active' ? active : profiles

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
      <TabsList>
        <TabsTrigger value="all" className="px-4">전체 {profiles.length}</TabsTrigger>
        <TabsTrigger value="pending" className="relative px-4">
          승인 대기
          {pending.length > 0 && (
            <Badge
              variant="outline"
              className="ml-1.5 h-4 min-w-4 px-1 text-[10px] leading-none text-amber-600 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-800/40 dark:bg-amber-950/30"
            >
              {pending.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="active" className="px-4">활성 {active.length}</TabsTrigger>
      </TabsList>

      <TabsContent value={tab} className="mt-4">
        {displayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Users className="h-10 w-10" />
            <p className="text-sm">
              {tab === 'pending' ? '승인 대기 중인 계정이 없습니다.' : '사용자가 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="hidden md:table-cell">이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead className="hidden lg:table-cell">가입일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayList.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.name || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{profile.email}</TableCell>
                    <TableCell>
                      <Select
                        value={profile.role}
                        onValueChange={(role) =>
                          changeRoleMutation.mutate({ id: profile.id, role: role as UserRole })
                        }
                        disabled={changeRoleMutation.isPending}
                      >
                        <SelectTrigger className="h-8 w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">편집자</SelectItem>
                          <SelectItem value="content_admin">콘텐츠어드민</SelectItem>
                          <SelectItem value="super_admin">슈퍼어드민</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(profile.created_at)}
                    </TableCell>
                    <TableCell>
                      {profile.is_active ? (
                        <Badge variant="secondary" className="text-emerald-600">
                          활성
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          승인 대기
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {!profile.is_active ? (
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate(profile.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          승인
                        </Button>
                      ) : (
                        <ConfirmDialog
                          trigger={
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deactivateMutation.isPending}
                            >
                              <XCircle className="mr-1.5 h-3.5 w-3.5" />
                              비활성화
                            </Button>
                          }
                          title="계정을 비활성화하시겠습니까?"
                          description="비활성화된 계정은 로그인할 수 없습니다. 나중에 다시 승인할 수 있습니다."
                          confirmLabel="비활성화"
                          onConfirm={() => deactivateMutation.mutate(profile.id)}
                          variant="destructive"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  )
}
