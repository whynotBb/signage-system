'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
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
import { GripVertical, Pencil, Trash2, Plus, UserCheck } from 'lucide-react'
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchVisitors(): Promise<VisitorRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('visitor_contents')
    .select('*, profiles(name)')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as VisitorRow[]
}

async function updateDisplayOrder(items: { id: string; display_order: number }[]): Promise<void> {
  const supabase = createClient()
  await Promise.all(
    items.map(({ id, display_order }) =>
      supabase.from('visitor_contents').update({ display_order }).eq('id', id)
    )
  )
}

async function toggleActive(id: string, is_active: boolean): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('visitor_contents')
    .update({ is_active })
    .eq('id', id)
  if (error) throw error
}

// ── SortableTableRow ──────────────────────────────────────────────────────────

interface SortableRowProps {
  item: VisitorRow
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onToggleActive: (checked: boolean) => void
  isTogglePending: boolean
}

function SortableTableRow({
  item,
  canEdit,
  onEdit,
  onDelete,
  onToggleActive,
  isTogglePending,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 1 : undefined,
    position: isDragging ? 'relative' : undefined,
  }

  const parsedNames = (() => {
    try {
      if (item.visitor_name.startsWith('[')) return JSON.parse(item.visitor_name) as string[]
    } catch {}
    return [item.visitor_name]
  })()

  const parsedTitles = (() => {
    try {
      if (item.visitor_title.startsWith('[')) return JSON.parse(item.visitor_title) as string[]
    } catch {}
    return [item.visitor_title]
  })()

  return (
    <TableRow ref={setNodeRef} style={style}>
      {/* 드래그 핸들 */}
      <TableCell className="w-8 px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          aria-label="순서 변경"
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>

      {/* 방문일 */}
      <TableCell className="text-sm">
        {formatDate(item.visit_date)}
      </TableCell>

      <TableCell className="font-medium">
        {item.title}
      </TableCell>

      <TableCell>
        {item.visitor_org}
      </TableCell>

      <TableCell>
        <div className="flex flex-col gap-1">
          {parsedNames.map((name, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="font-medium text-foreground">{name}</span>
              <span className="text-xs text-muted-foreground">{parsedTitles[idx] || ''}</span>
            </div>
          ))}
        </div>
      </TableCell>

      <TableCell className="text-sm">
        {item.location}
      </TableCell>

      <TableCell>
        <Switch
          checked={item.is_active}
          onCheckedChange={onToggleActive}
          disabled={isTogglePending}
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
        {canEdit && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onEdit}
              title="수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const reorderMutation = useMutation({
    mutationFn: updateDisplayOrder,
    onError: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all })
      toast.error('순서 저장에 실패했습니다.')
    },
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = visitorList.findIndex((item) => item.id === active.id)
    const newIndex = visitorList.findIndex((item) => item.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(visitorList, oldIndex, newIndex)

    // 낙관적 업데이트
    queryClient.setQueryData<VisitorRow[]>(queryKeys.visitors.all, reordered)

    // 서버 동기화
    reorderMutation.mutate(
      reordered.map((item, index) => ({ id: item.id, display_order: index + 1 }))
    )
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8 px-2" />
                    <TableHead className="w-[120px]">방문일</TableHead>
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
                <SortableContext
                  items={visitorList.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <TableBody>
                    {visitorList.map((item) => (
                      <SortableTableRow
                        key={item.id}
                        item={item}
                        canEdit={canEdit(item)}
                        onEdit={() => handleEdit(item)}
                        onDelete={() => setDeleteTarget(item)}
                        onToggleActive={(checked) =>
                          toggleActiveMutation.mutate({ id: item.id, is_active: checked })
                        }
                        isTogglePending={toggleActiveMutation.isPending}
                      />
                    ))}
                  </TableBody>
                </SortableContext>
              </Table>
            </div>
          </DndContext>
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
