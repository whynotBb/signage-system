'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { useAuthStore } from '@/store/auth-store'
import { GripVertical, Plus, Trash, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/composite/empty-state'
import { PageHeader } from '@/components/composite/page-header'
import { DivisionFormDialog } from './division-form-dialog'
import { TeamFormDialog } from './team-form-dialog'
import { EmployeeFormDialog } from './employee-form-dialog'
import type { Division, Team, Employee } from '@/types'

// ── Supabase 쿼리 함수 ────────────────────────────────────────────────────────

async function fetchDivisions(): Promise<Division[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('divisions')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

async function fetchTeams(): Promise<Team[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

async function fetchActiveEmployees(): Promise<Employee[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_resigned', false)
    .eq('is_dispatched', false)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ── display_order 일괄 업데이트 ───────────────────────────────────────────────

async function updateDivisionOrders(items: Division[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('divisions')
    .upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })))
  if (error) throw error
}

async function updateTeamOrders(items: Team[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('teams')
    .upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })))
  if (error) throw error
}

async function updateEmployeeOrders(items: Employee[]): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('employees')
    .upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })))
  if (error) throw error
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name.slice(0, 2)
}

// dragHandle prop 타입
type DragHandle = {
  attributes: ReturnType<typeof useSortable>['attributes']
  listeners: ReturnType<typeof useSortable>['listeners']
}

// ── EmployeeRow (정렬 가능) ───────────────────────────────────────────────────

interface EmployeeRowProps {
  employee: Employee
  isEditor: boolean
  onEdit?: (employee: Employee) => void
  onDelete?: (employee: Employee) => void
}

function EmployeeRowContent({ employee, isEditor, onEdit, onDelete }: EmployeeRowProps) {
  return (
    <>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
        <AvatarFallback className="text-[10px]">{getInitials(employee.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{employee.name}</span>
      {employee.position && (
        <span className="shrink-0 text-xs text-muted-foreground">{employee.position}</span>
      )}
      {employee.title && (
        <Badge className="shrink-0 border-0 bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          {employee.title}
        </Badge>
      )}
      {!isEditor && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => onEdit?.(employee)}
          >
            편집
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete?.(employee)}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      )}
    </>
  )
}

function SortableEmployeeRow(props: EmployeeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.employee.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
    >
      <div
        className="flex cursor-grab touch-none items-center"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
      </div>
      <EmployeeRowContent {...props} />
    </div>
  )
}

// ── TeamBlock (정렬 가능) ─────────────────────────────────────────────────────

interface TeamBlockProps {
  team: Team
  employees: Employee[]
  isEditor: boolean
  dragHandle?: DragHandle
  onAddEmployee?: (teamId: string) => void
  onEditTeam?: (team: Team) => void
  onDeleteTeam?: (team: Team) => void
  onEditEmployee?: (employee: Employee) => void
  onDeleteEmployee?: (employee: Employee) => void
}

function TeamBlockContent({
  team,
  employees,
  isEditor,
  dragHandle,
  onAddEmployee,
  onEditTeam,
  onDeleteTeam,
  onEditEmployee,
  onDeleteEmployee,
}: TeamBlockProps) {
  const queryClient = useQueryClient()
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (
    localEmployees.length !== employees.length ||
    localEmployees.some((e, i) => e.id !== employees[i]?.id)
  ) {
    setLocalEmployees(employees)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localEmployees.findIndex((e) => e.id === active.id)
    const newIndex = localEmployees.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(localEmployees, oldIndex, newIndex)
    setLocalEmployees(reordered)
    updateEmployeeOrders(reordered).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    })
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/80">
      {/* 팀 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2">
        {dragHandle && (
          <div
            className="flex cursor-grab touch-none items-center"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-muted-foreground" />
          </div>
        )}
        <span className="flex-1 text-sm font-semibold">{team.name}</span>
        {!isEditor && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onAddEmployee?.(team.id)}
            >
              <Plus className="h-3 w-3" />직원
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEditTeam?.(team)}
            >
              편집
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDeleteTeam?.(team)}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {localEmployees.length > 0 ? (
        <div className="border-t border-border/40 px-2 py-1">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={localEmployees.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {localEmployees.map((employee) => (
                <SortableEmployeeRow
                  key={employee.id}
                  employee={employee}
                  isEditor={isEditor}
                  onEdit={onEditEmployee}
                  onDelete={onDeleteEmployee}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      ) : (
        <div className="border-t border-border/40 px-3 py-2 text-xs text-muted-foreground">
          직원이 없습니다
        </div>
      )}
    </div>
  )
}

function SortableTeamBlock(props: TeamBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.team.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <TeamBlockContent
        {...props}
        dragHandle={!props.isEditor ? { attributes, listeners } : undefined}
      />
    </div>
  )
}

// ── DivisionCard (정렬 가능) ──────────────────────────────────────────────────

interface DivisionCardProps {
  division: Division
  teams: Team[]
  directEmployees: Employee[]
  employees: Employee[]
  isEditor: boolean
  dragHandle?: DragHandle
  onAddTeam?: (divisionId: string) => void
  onAddEmployee?: (divisionId: string, teamId?: string) => void
  onEditDivision?: (division: Division) => void
  onDeleteDivision?: (division: Division) => void
  onEditTeam?: (team: Team) => void
  onDeleteTeam?: (team: Team) => void
  onEditEmployee?: (employee: Employee) => void
  onDeleteEmployee?: (employee: Employee) => void
}

function DivisionCardContent({
  division,
  teams,
  directEmployees,
  employees,
  isEditor,
  dragHandle,
  onAddTeam,
  onAddEmployee,
  onEditDivision,
  onDeleteDivision,
  onEditTeam,
  onDeleteTeam,
  onEditEmployee,
  onDeleteEmployee,
}: DivisionCardProps) {
  const queryClient = useQueryClient()
  const [localTeams, setLocalTeams] = useState<Team[]>(teams)
  const [localDirectEmployees, setLocalDirectEmployees] = useState<Employee[]>(directEmployees)

  if (
    localTeams.length !== teams.length ||
    localTeams.some((t, i) => t.id !== teams[i]?.id)
  ) {
    setLocalTeams(teams)
  }
  if (
    localDirectEmployees.length !== directEmployees.length ||
    localDirectEmployees.some((e, i) => e.id !== directEmployees[i]?.id)
  ) {
    setLocalDirectEmployees(directEmployees)
  }

  const teamSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const directEmpSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleTeamDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localTeams.findIndex((t) => t.id === active.id)
    const newIndex = localTeams.findIndex((t) => t.id === over.id)
    const reordered = arrayMove(localTeams, oldIndex, newIndex)
    setLocalTeams(reordered)
    updateTeamOrders(reordered).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.all })
    })
  }

  function handleDirectEmpDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localDirectEmployees.findIndex((e) => e.id === active.id)
    const newIndex = localDirectEmployees.findIndex((e) => e.id === over.id)
    const reordered = arrayMove(localDirectEmployees, oldIndex, newIndex)
    setLocalDirectEmployees(reordered)
    updateEmployeeOrders(reordered).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all })
    })
  }

  const color = division.color ?? '#6366f1'
  // 실 대표색상 기반 5% 불투명도 배경 틴트
  const bgTint = color + '0d'

  return (
    <div
      className="rounded-lg border border-border shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: color, backgroundColor: bgTint }}
    >
      {/* 실 헤더 */}
      <div className="flex items-center gap-2 px-3 py-3">
        {dragHandle && (
          <div
            className="flex cursor-grab touch-none items-center"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-muted-foreground" />
          </div>
        )}
        <div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <span className="flex-1 text-base font-bold">{division.name}</span>
        {!isEditor && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onAddTeam?.(division.id)}
            >
              <Plus className="h-3 w-3" />팀
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => onAddEmployee?.(division.id)}
            >
              <Plus className="h-3 w-3" />직원
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onEditDivision?.(division)}
            >
              편집
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDeleteDivision?.(division)}
            >
              <Trash className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* 팀 블록 + 실 직속 직원 */}
      {(localTeams.length > 0 || localDirectEmployees.length > 0) && (
        <div className="flex flex-col gap-2 px-4 pb-3">
          {localTeams.length > 0 && (
            <DndContext
              sensors={teamSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleTeamDragEnd}
            >
              <SortableContext
                items={localTeams.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {localTeams.map((team) => {
                  const teamEmployees = employees.filter((e) => e.team_id === team.id)
                  return (
                    <SortableTeamBlock
                      key={team.id}
                      team={team}
                      employees={teamEmployees}
                      isEditor={isEditor}
                      onAddEmployee={(teamId) => onAddEmployee?.(division.id, teamId)}
                      onEditTeam={onEditTeam}
                      onDeleteTeam={onDeleteTeam}
                      onEditEmployee={onEditEmployee}
                      onDeleteEmployee={onDeleteEmployee}
                    />
                  )
                })}
              </SortableContext>
            </DndContext>
          )}

          {localDirectEmployees.length > 0 && (
            <div className="rounded-md border border-dashed border-border/60 bg-background/50">
              <div className="px-3 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  실 직속
                </span>
              </div>
              <div className="border-t border-border/40 px-2 py-1">
                <DndContext
                  sensors={directEmpSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDirectEmpDragEnd}
                >
                  <SortableContext
                    items={localDirectEmployees.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {localDirectEmployees.map((employee) => (
                      <SortableEmployeeRow
                        key={employee.id}
                        employee={employee}
                        isEditor={isEditor}
                        onEdit={onEditEmployee}
                        onDelete={onDeleteEmployee}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SortableDivisionCard(props: DivisionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.division.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <DivisionCardContent
        {...props}
        dragHandle={!props.isEditor ? { attributes, listeners } : undefined}
      />
    </div>
  )
}

// ── 대표/부대표 카드 ──────────────────────────────────────────────────────────

function RepresentativeCard({
  employee,
  label,
  isEditor,
  onAssign,
  onEdit,
}: {
  employee: Employee | null
  label: string
  isEditor: boolean
  onAssign?: () => void
  onEdit?: (employee: Employee) => void
}) {
  const isRep = label === '대표'

  if (!employee) {
    return (
      <div className="flex w-full max-w-[260px] items-center gap-4 rounded-lg border border-dashed border-border p-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-xs text-muted-foreground/50">미지정</span>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-sm font-semibold text-muted-foreground">{label}</span>
          {!isEditor && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 w-fit text-xs"
              onClick={onAssign}
            >
              <Plus className="mr-1 h-3 w-3" />지정
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex w-full max-w-[260px] items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm">
      <Avatar className="h-12 w-12 shrink-0">
        <AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
        <AvatarFallback className="text-base">{getInitials(employee.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold">{employee.name}</span>
        <div className="flex items-center gap-2">
          {employee.position && (
            <span className="text-sm text-muted-foreground">{employee.position}</span>
          )}
          {!isEditor && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => onEdit?.(employee)}
            >
              편집
            </Button>
          )}
        </div>
        <Badge
          variant="outline"
          className={
            isRep
              ? 'w-fit border-emerald-400 text-[10px] text-emerald-600'
              : 'w-fit border-violet-400 text-[10px] text-violet-600'
          }
        >
          {label}
        </Badge>
      </div>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function OrgBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full rounded-lg" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── OrgBoard 메인 컴포넌트 ───────────────────────────────────────────────────

export function OrgBoard() {
  const user = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const isEditor = user?.role === 'editor'

  const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
    queryKey: queryKeys.divisions.all,
    queryFn: fetchDivisions,
  })
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: queryKeys.teams.all,
    queryFn: fetchTeams,
  })
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: queryKeys.employees.all,
    queryFn: fetchActiveEmployees,
  })

  const isLoading = divisionsLoading || teamsLoading || employeesLoading

  const [localDivisions, setLocalDivisions] = useState<Division[]>(divisions)
  if (
    localDivisions.length !== divisions.length ||
    localDivisions.some((d, i) => d.id !== divisions[i]?.id)
  ) {
    setLocalDivisions(divisions)
  }

  // ── 다이얼로그 상태 ───────────────────────────────────────────────────────
  const [divisionDialogOpen, setDivisionDialogOpen] = useState(false)
  const [editingDivision, setEditingDivision] = useState<Division | null>(null)

  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [teamDefaultDivisionId, setTeamDefaultDivisionId] = useState<string | null>(null)

  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [employeeDefaultDivisionId, setEmployeeDefaultDivisionId] = useState<string | null>(null)
  const [employeeDefaultTeamId, setEmployeeDefaultTeamId] = useState<string | null>(null)

  // ── 다이얼로그 핸들러 ─────────────────────────────────────────────────────
  function openAddDivision() {
    setEditingDivision(null)
    setDivisionDialogOpen(true)
  }
  function openEditDivision(division: Division) {
    setEditingDivision(division)
    setDivisionDialogOpen(true)
  }
  function openAddTeam(divisionId?: string | null) {
    setEditingTeam(null)
    setTeamDefaultDivisionId(divisionId ?? null)
    setTeamDialogOpen(true)
  }
  function openEditTeam(team: Team) {
    setEditingTeam(team)
    setTeamDefaultDivisionId(null)
    setTeamDialogOpen(true)
  }
  function openAddEmployee(divisionId?: string | null, teamId?: string | null) {
    setEditingEmployee(null)
    setEmployeeDefaultDivisionId(divisionId ?? null)
    setEmployeeDefaultTeamId(teamId ?? null)
    setEmployeeDialogOpen(true)
  }
  function openEditEmployee(employee: Employee) {
    setEditingEmployee(employee)
    setEmployeeDefaultDivisionId(null)
    setEmployeeDefaultTeamId(null)
    setEmployeeDialogOpen(true)
  }

  // ── DnD (실 레벨) ─────────────────────────────────────────────────────────
  const divisionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [activeDivisionId, setActiveDivisionId] = useState<string | null>(null)

  function handleDivisionDragStart(event: DragStartEvent) {
    setActiveDivisionId(event.active.id as string)
  }
  function handleDivisionDragEnd(event: DragEndEvent) {
    setActiveDivisionId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = localDivisions.findIndex((d) => d.id === active.id)
    const newIndex = localDivisions.findIndex((d) => d.id === over.id)
    const reordered = arrayMove(localDivisions, oldIndex, newIndex)
    setLocalDivisions(reordered)
    updateDivisionOrders(reordered).then(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all })
    })
  }

  const representative = employees.find((e) => e.org_role === 'representative') ?? null
  const viceRepresentative = employees.find((e) => e.org_role === 'vice_representative') ?? null
  const independentTeams = teams.filter((t) => !t.division_id)
  const activeDivision = activeDivisionId
    ? localDivisions.find((d) => d.id === activeDivisionId)
    : null

  if (isLoading) return <OrgBoardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      {/* PageHeader — 우측에 액션 버튼 */}
      <PageHeader title="조직도 관리" description="사이니지에 표시할 조직도를 관리합니다.">
        {!isEditor && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={openAddDivision}>
              <Plus className="h-3 w-3" />실 추가
            </Button>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => openAddTeam(null)}>
              <Plus className="h-3 w-3" />팀 추가
            </Button>
            <Button size="sm" className="gap-1" onClick={() => openAddEmployee(null, null)}>
              <Plus className="h-3 w-3" />직원 추가
            </Button>
          </div>
        )}
      </PageHeader>

      {/* 대표/부대표 */}
      <div className="rounded-lg border border-border/50 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          대표 · 부대표
        </p>
        <div className="flex gap-3">
          <RepresentativeCard
            employee={representative}
            label="대표"
            isEditor={isEditor}
            onAssign={() => openAddEmployee(null, null)}
            onEdit={openEditEmployee}
          />
          <RepresentativeCard
            employee={viceRepresentative}
            label="부대표"
            isEditor={isEditor}
            onAssign={() => openAddEmployee(null, null)}
            onEdit={openEditEmployee}
          />
        </div>
      </div>

      {/* 조직 구조 */}
      <div className="flex flex-col gap-4">
        {localDivisions.length === 0 && independentTeams.length === 0 ? (
          <EmptyState
            icon={Users}
            title="조직도 데이터가 없습니다"
            description="실을 추가하여 조직도를 구성해보세요."
          />
        ) : (
          <>
            <DndContext
              sensors={divisionSensors}
              collisionDetection={closestCenter}
              onDragStart={handleDivisionDragStart}
              onDragEnd={handleDivisionDragEnd}
            >
              <SortableContext
                items={localDivisions.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                {localDivisions.map((division) => {
                  const divisionTeams = teams.filter((t) => t.division_id === division.id)
                  const directEmployees = employees.filter(
                    (e) => e.division_id === division.id && !e.team_id && e.org_role === 'member'
                  )
                  return (
                    <SortableDivisionCard
                      key={division.id}
                      division={division}
                      teams={divisionTeams}
                      directEmployees={directEmployees}
                      employees={employees}
                      isEditor={isEditor}
                      onAddTeam={(divId) => openAddTeam(divId)}
                      onAddEmployee={(divId, teamId) => openAddEmployee(divId, teamId)}
                      onEditDivision={openEditDivision}
                      onDeleteDivision={openEditDivision}
                      onEditTeam={openEditTeam}
                      onDeleteTeam={openEditTeam}
                      onEditEmployee={openEditEmployee}
                      onDeleteEmployee={openEditEmployee}
                    />
                  )
                })}
              </SortableContext>

              <DragOverlay>
                {activeDivision && (
                  <div
                    className="rounded-lg border border-border px-4 py-3 shadow-lg opacity-90"
                    style={{
                      borderLeftWidth: 4,
                      borderLeftColor: activeDivision.color ?? '#6366f1',
                      backgroundColor: (activeDivision.color ?? '#6366f1') + '0d',
                    }}
                  >
                    <span className="font-bold">{activeDivision.name}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* 독립 팀 */}
            {independentTeams.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    독립 팀
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                {independentTeams.map((team) => {
                  const teamEmployees = employees.filter((e) => e.team_id === team.id)
                  return (
                    <TeamBlockContent
                      key={team.id}
                      team={team}
                      employees={teamEmployees}
                      isEditor={isEditor}
                      onAddEmployee={(teamId) => openAddEmployee(null, teamId)}
                      onEditTeam={openEditTeam}
                      onDeleteTeam={openEditTeam}
                      onEditEmployee={openEditEmployee}
                      onDeleteEmployee={openEditEmployee}
                    />
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* CRUD 다이얼로그 */}
      <DivisionFormDialog
        open={divisionDialogOpen}
        onOpenChange={setDivisionDialogOpen}
        division={editingDivision}
      />
      <TeamFormDialog
        open={teamDialogOpen}
        onOpenChange={setTeamDialogOpen}
        team={editingTeam}
        defaultDivisionId={teamDefaultDivisionId}
      />
      <EmployeeFormDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        employee={editingEmployee}
        defaultDivisionId={employeeDefaultDivisionId}
        defaultTeamId={employeeDefaultTeamId}
        allEmployees={employees}
        canManageOrgRole={!isEditor}
      />
    </div>
  )
}
