'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { useAuthStore } from '@/store/auth-store'
import { toast } from 'sonner'
import { VisitorFormDialog } from './visitor-form-dialog'
import { DeleteVisitorDialog } from './delete-visitor-dialog'
import { PageHeader } from '@/components/composite/page-header'
import { EmptyState } from '@/components/composite/empty-state'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Pencil, Trash2, Plus, UserCheck } from 'lucide-react'
import type { VisitorContent } from '@/types'

// ── 타입 ─────────────────────────────────────────────────────────────────────

type VisitorRow = VisitorContent & {
  profiles: { name: string } | null
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDatetime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchVisitors(): Promise<VisitorRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('visitor_contents')
    .select('*, profiles(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as VisitorRow[]
}

async function toggleActive(id: string, is_active: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('visitor_contents')
    .update({ is_active })
    .eq('id', id)
  if (error) throw error
}

// ── VisitorTable ─────────────────────────────────────────────────────────────

export function VisitorTable() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<VisitorContent | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<VisitorRow | null>(null)

  const { data: visitorList = [], isLoading } = useQuery({
    queryKey: queryKeys.visitors.all,
    queryFn: fetchVisitors,
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      toggleActive(id, is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() })
    },
    onError: () => toast.error('상태 변경에 실패했습니다.'),
  })

  function canEdit(item: VisitorRow): boolean {
    if (!user) return false
    if (user.role === 'editor') return item.created_by === user.id
    return true
  }

  function handleEdit(item: VisitorRow) {
    setEditTarget(item)
    setFormOpen(true)
  }

  function handleCreate() {
    setEditTarget(null)
    setFormOpen(true)
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="방문자 관리"
          description="방문자 정보를 관리하고 사이니지에 표시합니다."
        >
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            방문자 등록
          </Button>
        </PageHeader>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : visitorList.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="등록된 방문자 공지가 없습니다"
            description="방문자 등록 버튼을 눌러 첫 번째 방문 공지를 등록하세요."
            action={{ label: '방문자 등록', onClick: handleCreate }}
          />
        ) : (
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">방문 목적</TableHead>
                  <TableHead className="w-[150px]">방문 기관</TableHead>
                  <TableHead className="w-[150px]">방문자</TableHead>
                  <TableHead className="w-[120px]">방문 장소</TableHead>
                  <TableHead className="w-[80px]">활성</TableHead>
                  <TableHead className="w-[190px]">게시 기간</TableHead>
                  <TableHead className="w-[100px]">등록자</TableHead>
                  <TableHead className="w-[80px]">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitorList.map((item) => {
                  const itemCanEdit = canEdit(item)
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.title}
                      </TableCell>
                      
                      <TableCell>
                        {item.visitor_org}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-foreground">{item.visitor_name}</span>
                          <span className="text-xs text-muted-foreground">{item.visitor_title}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-sm">
                        {item.location}
                      </TableCell>

                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: item.id, is_active: checked })
                          }
                          disabled={toggleActiveMutation.isPending}
                          aria-label={item.is_active ? '활성' : '비활성'}
                        />
                      </TableCell>

                      <TableCell className="tabular-nums text-xs text-muted-foreground">
                        {item.scheduled_start_at || item.scheduled_end_at ? (
                          <div className="flex flex-col gap-0.5">
                            <span>{formatDatetime(item.scheduled_start_at)}</span>
                            <span>→ {formatDatetime(item.scheduled_end_at)}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">상시</Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground">
                        {item.profiles?.name ?? '—'}
                      </TableCell>

                      <TableCell>
                        {itemCanEdit && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(item)}
                              title="수정"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(item)}
                              title="삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <VisitorFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v)
          if (!v) setEditTarget(null)
        }}
        visitor={editTarget}
      />

      {deleteTarget && (
        <DeleteVisitorDialog
          open={!!deleteTarget}
          onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}
          visitorId={deleteTarget.id}
          title={deleteTarget.title}
        />
      )}
    </>
  )
}
