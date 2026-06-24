"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay, useDroppable, closestCenter, type DragEndEvent, type DragStartEvent, type DragOverEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { GripVertical, Plus, Trash, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/composite/empty-state";
import { PageHeader } from "@/components/composite/page-header";
import { DivisionFormDialog } from "./division-form-dialog";
import { TeamFormDialog } from "./team-form-dialog";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { DeleteDivisionDialog } from "./delete-division-dialog";
import { DeleteTeamDialog } from "./delete-team-dialog";
import type { Division, Team, Employee } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type ContainerId = string; // 'team:{teamId}' | 'div-direct:{divisionId}'

type ActiveItem = { type: "DIVISION"; data: Division } | { type: "TEAM"; data: Team } | { type: "EMPLOYEE"; data: Employee };

type DragHandle = {
	attributes: ReturnType<typeof useSortable>["attributes"];
	listeners: ReturnType<typeof useSortable>["listeners"];
};

// ── Supabase 쿼리 ─────────────────────────────────────────────────────────────

async function fetchDivisions(): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchTeams(): Promise<Team[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("teams").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchActiveEmployees(): Promise<Employee[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("employees").select("*").eq("is_resigned", false).eq("is_dispatched", false).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

// ── display_order 업데이트 ────────────────────────────────────────────────────

async function updateDivisionOrders(items: Division[]): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("divisions").upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })));
	if (error) throw error;
}

async function updateTeamOrders(items: Team[]): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("teams").upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })));
	if (error) throw error;
}

async function updateEmployeeOrders(items: Employee[]): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("employees").upsert(items.map((item, i) => ({ ...item, display_order: i + 1 })));
	if (error) throw error;
}

async function moveEmployeeToContainer(employeeId: string, teamId: string | null, divisionId: string | null): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("employees").update({ team_id: teamId, division_id: divisionId }).eq("id", employeeId);
	if (error) throw error;
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
	return name.slice(0, 2);
}

function findContainer(id: string, containers: Record<string, Employee[]>): ContainerId | null {
	if (id in containers) return id;
	// over.id가 팀 UUID 또는 실 UUID로 넘어올 때 prefix 매핑
	if ((`team:${id}` as ContainerId) in containers) return `team:${id}` as ContainerId;
	if ((`div-direct:${id}` as ContainerId) in containers) return `div-direct:${id}` as ContainerId;
	for (const [containerId, emps] of Object.entries(containers)) {
		if (emps.some((e) => e.id === id)) return containerId;
	}
	return null;
}

// ── EmployeeRow ───────────────────────────────────────────────────────────────

interface EmployeeRowProps {
	employee: Employee;
	containerId: ContainerId;
	isEditor: boolean;
	onEdit?: (employee: Employee) => void;
	onDelete?: (employee: Employee) => void;
}

function EmployeeRowContent({ employee, isEditor, onEdit, onDelete }: Omit<EmployeeRowProps, "containerId">) {
	return (
		<>
			<Avatar className="h-7 w-7 shrink-0">
				<AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
				<AvatarFallback className="text-[10px]">{getInitials(employee.name)}</AvatarFallback>
			</Avatar>
			<span className="min-w-0 truncate text-sm font-medium">{employee.name}</span>
			{employee.position && <span className="shrink-0 text-xs text-muted-foreground">{employee.position}</span>}
			{employee.title && <Badge className="shrink-0 border-0 bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{employee.title}</Badge>}
			{!isEditor && (
				<div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 ml-auto">
					<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onEdit?.(employee)}>
						편집
					</Button>
					<Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete?.(employee)}>
						<Trash className="h-3 w-3" />
					</Button>
				</div>
			)}
		</>
	);
}

function SortableEmployeeRow({ employee, containerId, isEditor, onEdit, onDelete }: EmployeeRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: employee.id,
		data: { type: "EMPLOYEE", containerId },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
			<div className="flex cursor-grab touch-none items-center" {...attributes} {...listeners}>
				<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
			</div>
			<EmployeeRowContent employee={employee} isEditor={isEditor} onEdit={onEdit} onDelete={onDelete} />
		</div>
	);
}

// ── TeamBlock ─────────────────────────────────────────────────────────────────

interface TeamBlockProps {
	team: Team;
	employees: Employee[];
	containerId: ContainerId;
	isEditor: boolean;
	dragHandle?: DragHandle;
	onAddEmployee?: (teamId: string) => void;
	onEditTeam?: (team: Team) => void;
	onDeleteTeam?: (team: Team) => void;
	onEditEmployee?: (employee: Employee) => void;
	onDeleteEmployee?: (employee: Employee) => void;
}

function TeamBlockContent({ team, employees, containerId, isEditor, dragHandle, onAddEmployee, onEditTeam, onDeleteTeam, onEditEmployee, onDeleteEmployee }: TeamBlockProps) {
	const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerId });

	return (
		<div className="rounded-md border border-border/60 bg-background/80">
			<div className="flex items-center gap-2 px-3 py-2">
				{dragHandle && (
					<div className="flex cursor-grab touch-none items-center" {...dragHandle.attributes} {...dragHandle.listeners}>
						<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-muted-foreground" />
					</div>
				)}
				<span className="flex-1 text-sm font-semibold">{team.name}</span>
				{!isEditor && (
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAddEmployee?.(team.id)}>
							<Plus className="h-3 w-3" />
							직원
						</Button>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEditTeam?.(team)}>
							편집
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteTeam?.(team)}>
							<Trash className="h-3 w-3" />
						</Button>
					</div>
				)}
			</div>

			<div ref={setDropRef} className={cn("min-h-[32px] border-t border-border/40 px-2 py-1 transition-colors", isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30")}>
				<SortableContext items={employees.map((e) => e.id)} strategy={verticalListSortingStrategy}>
					{employees.map((employee) => (
						<SortableEmployeeRow key={employee.id} employee={employee} containerId={containerId} isEditor={isEditor} onEdit={onEditEmployee} onDelete={onDeleteEmployee} />
					))}
				</SortableContext>
				{employees.length === 0 && <div className={cn("py-1.5 text-center text-xs text-muted-foreground/50 transition-colors", isOver && "text-primary/60")}>{isOver ? "여기에 드롭" : "직원 없음"}</div>}
			</div>
		</div>
	);
}

function SortableTeamBlock(props: TeamBlockProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.team.id,
		data: { type: "TEAM", divisionId: props.team.division_id },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<TeamBlockContent {...props} dragHandle={!props.isEditor ? { attributes, listeners } : undefined} />
		</div>
	);
}

// ── DivisionCard ──────────────────────────────────────────────────────────────

interface DivisionCardProps {
	division: Division;
	teams: Team[];
	isEditor: boolean;
	dragHandle?: DragHandle;
	employeeContainers: Record<string, Employee[]>;
	isDraggingEmployee: boolean;
	onAddTeam?: (divisionId: string) => void;
	onAddEmployee?: (divisionId: string, teamId?: string) => void;
	onEditDivision?: (division: Division) => void;
	onDeleteDivision?: (division: Division) => void;
	onEditTeam?: (team: Team) => void;
	onDeleteTeam?: (team: Team) => void;
	onEditEmployee?: (employee: Employee) => void;
	onDeleteEmployee?: (employee: Employee) => void;
}

function DivisionCardContent({ division, teams, isEditor, dragHandle, employeeContainers, isDraggingEmployee, onAddTeam, onAddEmployee, onEditDivision, onDeleteDivision, onEditTeam, onDeleteTeam, onEditEmployee, onDeleteEmployee }: DivisionCardProps) {
	const directContainerId: ContainerId = `div-direct:${division.id}`;
	const directEmployees = employeeContainers[directContainerId] ?? [];
	const { setNodeRef: setDirectDropRef, isOver: isDirectOver } = useDroppable({
		id: directContainerId,
	});

	const color = division.color ?? "#6366f1";
	const bgTint = color + "0d";

	const showDirectSection = directEmployees.length > 0 || isDraggingEmployee || isDirectOver;

	return (
		<div className="rounded-lg border border-border shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: color, backgroundColor: bgTint }}>
			{/* 실 헤더 */}
			<div className="flex items-center gap-2 px-3 py-3">
				{dragHandle && (
					<div className="flex cursor-grab touch-none items-center" {...dragHandle.attributes} {...dragHandle.listeners}>
						<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-muted-foreground" />
					</div>
				)}
				<div className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
				<span className="flex-1 text-base font-bold">{division.name}</span>
				{!isEditor && (
					<div className="flex items-center gap-1">
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAddTeam?.(division.id)}>
							<Plus className="h-3 w-3" />팀
						</Button>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onAddEmployee?.(division.id)}>
							<Plus className="h-3 w-3" />
							직원
						</Button>
						<Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onEditDivision?.(division)}>
							편집
						</Button>
						<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDeleteDivision?.(division)}>
							<Trash className="h-3 w-3" />
						</Button>
					</div>
				)}
			</div>

			{/* 팀 블록 + 직속 직원 */}
			{(teams.length > 0 || showDirectSection) && (
				<div className="flex flex-col gap-2 px-4 pb-3">
					{teams.length > 0 && (
						<SortableContext items={teams.map((t) => t.id)} strategy={verticalListSortingStrategy}>
							{teams.map((team) => (
								<SortableTeamBlock key={team.id} team={team} employees={employeeContainers[`team:${team.id}`] ?? []} containerId={`team:${team.id}`} isEditor={isEditor} onAddEmployee={(teamId) => onAddEmployee?.(division.id, teamId)} onEditTeam={onEditTeam} onDeleteTeam={onDeleteTeam} onEditEmployee={onEditEmployee} onDeleteEmployee={onDeleteEmployee} />
							))}
						</SortableContext>
					)}

					{showDirectSection && (
						<div ref={setDirectDropRef} className={cn("rounded-md border border-dashed border-border/60 bg-background/50 transition-colors", isDirectOver && "border-primary/40 bg-primary/5")}>
							<div className="px-3 py-1.5">
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">실 직속</span>
							</div>
							<div className="border-t border-border/40 px-2 py-1">
								<SortableContext items={directEmployees.map((e) => e.id)} strategy={verticalListSortingStrategy}>
									{directEmployees.map((employee) => (
										<SortableEmployeeRow key={employee.id} employee={employee} containerId={directContainerId} isEditor={isEditor} onEdit={onEditEmployee} onDelete={onDeleteEmployee} />
									))}
								</SortableContext>
								{directEmployees.length === 0 && <div className={cn("py-1.5 text-center text-xs text-muted-foreground/50 transition-colors", isDirectOver && "text-primary/60")}>{isDirectOver ? "여기에 드롭" : "직원을 드래그해 추가"}</div>}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function SortableDivisionCard(props: DivisionCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.division.id,
		data: { type: "DIVISION" },
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<DivisionCardContent {...props} dragHandle={!props.isEditor ? { attributes, listeners } : undefined} />
		</div>
	);
}

// ── 대표/부대표 카드 ──────────────────────────────────────────────────────────

function RepresentativeCard({ employee, label, isEditor, onAssign, onEdit }: { employee: Employee | null; label: string; isEditor: boolean; onAssign?: () => void; onEdit?: (employee: Employee) => void }) {
	const isRep = label === "대표";

	if (!employee) {
		return (
			<div className="flex w-full max-w-[260px] items-center gap-4 rounded-lg border border-dashed border-border p-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
					<span className="text-xs text-muted-foreground/50">미지정</span>
				</div>
				<div className="flex flex-1 flex-col gap-1">
					<span className="text-sm font-semibold text-muted-foreground">{label}</span>
					{!isEditor && (
						<Button variant="outline" size="sm" className="h-7 w-fit text-xs" onClick={onAssign}>
							<Plus className="mr-1 h-3 w-3" />
							지정
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex w-full max-w-[260px] items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm">
			<Avatar className="h-12 w-12 shrink-0">
				<AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
				<AvatarFallback className="text-base">{getInitials(employee.name)}</AvatarFallback>
			</Avatar>
			<div className="flex items-center gap-2 flex-1">
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-center gap-2">
						<Badge variant="outline" className={isRep ? "w-fit text-[10px] border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "w-fit text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"}>
							{label}
						</Badge>
					</div>
					<span className="font-semibold text-xl">{employee.name}</span>
					{/* <Badge variant="outline" className={isRep ? "w-fit text-[10px] border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "w-fit text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"}>
					{label}
				</Badge> */}
				</div>
				{!isEditor && (
					<Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onEdit?.(employee)}>
						편집
					</Button>
				)}
			</div>
		</div>
	);
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
	);
}

// ── OrgBoard 메인 컴포넌트 ───────────────────────────────────────────────────

export function OrgBoard() {
	const user = useAuthStore((s) => s.user);
	const queryClient = useQueryClient();
	const isEditor = user?.role === "editor";

	const { data: divisions = [], isLoading: divisionsLoading } = useQuery({
		queryKey: queryKeys.divisions.all,
		queryFn: fetchDivisions,
	});
	const { data: teams = [], isLoading: teamsLoading } = useQuery({
		queryKey: queryKeys.teams.all,
		queryFn: fetchTeams,
	});
	const { data: employees = [], isLoading: employeesLoading } = useQuery({
		queryKey: queryKeys.employees.all,
		queryFn: fetchActiveEmployees,
	});

	const isLoading = divisionsLoading || teamsLoading || employeesLoading;

	// ── 낙관적 순서 상태 ─────────────────────────────────────────────────────
	const [localDivisions, setLocalDivisions] = useState<Division[]>(divisions);
	const [localTeams, setLocalTeams] = useState<Team[]>(teams);

	// ── 직원 컨테이너 상태 (크로스 컨테이너 DnD) ─────────────────────────────
	const [employeeContainers, setEmployeeContainers] = useState<Record<string, Employee[]>>({});
	const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
	// onDragOver 낙관적 업데이트로 active.data가 바뀌기 전 원래 컨테이너 ID 보존
	const dragStartContainerRef = useRef<ContainerId | null>(null);

	// DnD 중이 아닐 때만 서버 데이터로 동기화
	// useEffect(() => {
	// 	if (!activeItem) setLocalDivisions(divisions);
	// }, [divisions, activeItem]);

	// useEffect(() => {
	// 	if (!activeItem) setLocalTeams(teams);
	// }, [teams, activeItem]);

	// [수정] 위 코드 빨간줄 오류로 : DnD 중이 아닐 때, 원본 props가 변경되면 그 즉시 로컬 상태 동기화 (useEffect 대체)
	if (!activeItem) {
		// 현재 로컬 상태와 새로 들어온 props의 실제 내용이 다를 때만 업데이트
		if (JSON.stringify(localDivisions) !== JSON.stringify(divisions)) {
			setLocalDivisions(divisions);
		}
		if (JSON.stringify(localTeams) !== JSON.stringify(teams)) {
			setLocalTeams(teams);
		}
	}

	useEffect(() => {
		// 직원 드래그 중에는 서버 데이터로 리셋하지 않음
		if (activeItem?.type === "EMPLOYEE") return;
		const containers: Record<string, Employee[]> = {};
		teams.forEach((t) => {
			containers[`team:${t.id}`] = [];
		});
		divisions.forEach((d) => {
			containers[`div-direct:${d.id}`] = [];
		});
		employees
			.filter((e) => e.org_role === "member")
			.forEach((e) => {
				if (e.team_id && `team:${e.team_id}` in containers) {
					containers[`team:${e.team_id}`].push(e);
				} else if (e.division_id && `div-direct:${e.division_id}` in containers) {
					containers[`div-direct:${e.division_id}`].push(e);
				}
			});
		setEmployeeContainers(containers);
	}, [employees, teams, divisions, activeItem]);

	// ── 다이얼로그 상태 (CRUD) ───────────────────────────────────────────────
	const [divisionDialogOpen, setDivisionDialogOpen] = useState(false);
	const [editingDivision, setEditingDivision] = useState<Division | null>(null);

	const [teamDialogOpen, setTeamDialogOpen] = useState(false);
	const [editingTeam, setEditingTeam] = useState<Team | null>(null);
	const [teamDefaultDivisionId, setTeamDefaultDivisionId] = useState<string | null>(null);

	const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
	const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
	const [employeeDefaultDivisionId, setEmployeeDefaultDivisionId] = useState<string | null>(null);
	const [employeeDefaultTeamId, setEmployeeDefaultTeamId] = useState<string | null>(null);

	// ── 다이얼로그 상태 (삭제) ────────────────────────────────────────────────
	const [deletingDivision, setDeletingDivision] = useState<Division | null>(null);
	const [divisionDeleteOpen, setDivisionDeleteOpen] = useState(false);
	const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
	const [teamDeleteOpen, setTeamDeleteOpen] = useState(false);

	// ── CRUD 핸들러 ──────────────────────────────────────────────────────────
	function openAddDivision() {
		setEditingDivision(null);
		setDivisionDialogOpen(true);
	}
	function openEditDivision(division: Division) {
		setEditingDivision(division);
		setDivisionDialogOpen(true);
	}
	function openDeleteDivision(division: Division) {
		setDeletingDivision(division);
		setDivisionDeleteOpen(true);
	}
	function openAddTeam(divisionId?: string | null) {
		setEditingTeam(null);
		setTeamDefaultDivisionId(divisionId ?? null);
		setTeamDialogOpen(true);
	}
	function openEditTeam(team: Team) {
		setEditingTeam(team);
		setTeamDefaultDivisionId(null);
		setTeamDialogOpen(true);
	}
	function openDeleteTeam(team: Team) {
		setDeletingTeam(team);
		setTeamDeleteOpen(true);
	}
	function openAddEmployee(divisionId?: string | null, teamId?: string | null) {
		setEditingEmployee(null);
		setEmployeeDefaultDivisionId(divisionId ?? null);
		setEmployeeDefaultTeamId(teamId ?? null);
		setEmployeeDialogOpen(true);
	}
	function openEditEmployee(employee: Employee) {
		setEditingEmployee(employee);
		setEmployeeDefaultDivisionId(null);
		setEmployeeDefaultTeamId(null);
		setEmployeeDialogOpen(true);
	}

	// ── DnD 센서 ─────────────────────────────────────────────────────────────
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	// ── DnD 핸들러 ───────────────────────────────────────────────────────────
	function handleDragStart(event: DragStartEvent) {
		const { active } = event;
		const type = active.data.current?.type as string | undefined;
		if (type === "DIVISION") {
			const div = localDivisions.find((d) => d.id === active.id);
			if (div) setActiveItem({ type: "DIVISION", data: div });
		} else if (type === "TEAM") {
			const team = localTeams.find((t) => t.id === active.id);
			if (team) setActiveItem({ type: "TEAM", data: team });
		} else if (type === "EMPLOYEE") {
			const containerId = active.data.current?.containerId as string;
			dragStartContainerRef.current = containerId as ContainerId;
			const emp = employeeContainers[containerId]?.find((e) => e.id === active.id);
			if (emp) setActiveItem({ type: "EMPLOYEE", data: emp });
		}
	}

	function handleDragOver(event: DragOverEvent) {
		const { active, over } = event;
		if (!over) return;
		if (active.data.current?.type !== "EMPLOYEE") return;

		const fromContainer = active.data.current.containerId as string;
		const toContainer = findContainer(over.id as string, employeeContainers);
		if (!toContainer || fromContainer === toContainer) return;

		setEmployeeContainers((prev) => {
			const employee = prev[fromContainer]?.find((e) => e.id === active.id);
			if (!employee) return prev;
			return {
				...prev,
				[fromContainer]: prev[fromContainer].filter((e) => e.id !== active.id),
				[toContainer]: [...(prev[toContainer] ?? []), employee],
			};
		});

		// activeItem의 containerId를 업데이트하여 다음 dragOver에서 올바른 from을 사용
		if (activeItem?.type === "EMPLOYEE") {
			setActiveItem((prev) => (prev?.type === "EMPLOYEE" ? prev : prev));
			// useSortable data는 불변이므로 active.data.current.containerId 직접 수정 불가
			// → onDragEnd에서 최종 컨테이너를 employeeContainers에서 다시 조회
		}
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveItem(null);
		if (!over) return;

		const activeType = active.data.current?.type as string | undefined;

		if (activeType === "DIVISION") {
			const oldIndex = localDivisions.findIndex((d) => d.id === active.id);
			const newIndex = localDivisions.findIndex((d) => d.id === over.id);
			if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
			const reordered = arrayMove(localDivisions, oldIndex, newIndex);
			setLocalDivisions(reordered);
			updateDivisionOrders(reordered).then(() => {
				queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all });
			});
			return;
		}

		if (activeType === "TEAM") {
			const divisionId = active.data.current?.divisionId as string | null;
			const divTeams = localTeams.filter((t) => t.division_id === divisionId);
			const oldIndex = divTeams.findIndex((t) => t.id === active.id);
			const newIndex = divTeams.findIndex((t) => t.id === over.id);
			if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
			const reordered = arrayMove(divTeams, oldIndex, newIndex);
			const updatedLocalTeams = [...localTeams.filter((t) => t.division_id !== divisionId), ...reordered];
			setLocalTeams(updatedLocalTeams);
			updateTeamOrders(reordered).then(() => {
				queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
			});
			return;
		}

		if (activeType === "EMPLOYEE") {
			// onDragOver에서 이미 낙관적 이동 완료 → 최종 컨테이너 확인
			const toContainer = findContainer(over.id as string, employeeContainers);
			if (!toContainer) return;

			// dragStartContainerRef 사용: onDragOver 낙관적 업데이트 후 active.data가 바뀌기 때문
			const fromContainer = (dragStartContainerRef.current ?? active.data.current?.containerId) as string;
			dragStartContainerRef.current = null;

			if (fromContainer === toContainer) {
				// 같은 컨테이너 내 정렬
				const containerEmps = employeeContainers[toContainer] ?? [];
				const oldIndex = containerEmps.findIndex((e) => e.id === active.id);
				const newIndex = containerEmps.findIndex((e) => e.id === over.id);
				if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
				const reordered = arrayMove(containerEmps, oldIndex, newIndex);
				setEmployeeContainers((prev) => ({ ...prev, [toContainer]: reordered }));
				updateEmployeeOrders(reordered).then(() => {
					queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
				});
			} else {
				// 컨테이너 간 이동 (onDragOver에서 UI 이미 업데이트됨)
				let newTeamId: string | null = null;
				let newDivisionId: string | null = null;

				if (toContainer.startsWith("team:")) {
					newTeamId = toContainer.slice(5);
					newDivisionId = localTeams.find((t) => t.id === newTeamId)?.division_id ?? null;
				} else if (toContainer.startsWith("div-direct:")) {
					newTeamId = null;
					newDivisionId = toContainer.slice(11);
				}

				moveEmployeeToContainer(active.id as string, newTeamId, newDivisionId).then(() => {
					queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
				});
			}
		}
	}

	// ── 파생 데이터 ──────────────────────────────────────────────────────────
	const representative = employees.find((e) => e.org_role === "representative") ?? null;
	const viceRepresentative = employees.find((e) => e.org_role === "vice_representative") ?? null;
	const independentTeams = localTeams.filter((t) => !t.division_id);
	const isDraggingEmployee = activeItem?.type === "EMPLOYEE";

	if (isLoading) return <OrgBoardSkeleton />;

	return (
		<div className="flex flex-col gap-6">
			{/* PageHeader */}
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
							<Plus className="h-3 w-3" />
							직원 추가
						</Button>
					</div>
				)}
			</PageHeader>

			{/* 대표/부대표 */}
			<div className="rounded-lg border border-border/50 p-4">
				<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">대표 · 부대표</p>
				<div className="flex gap-3">
					<RepresentativeCard employee={representative} label="대표" isEditor={isEditor} onAssign={() => openAddEmployee(null, null)} onEdit={openEditEmployee} />
					<RepresentativeCard employee={viceRepresentative} label="부대표" isEditor={isEditor} onAssign={() => openAddEmployee(null, null)} onEdit={openEditEmployee} />
				</div>
			</div>

			{/* 조직 구조 — 단일 DndContext */}
			<div className="flex flex-col gap-4">
				{localDivisions.length === 0 && independentTeams.length === 0 ? (
					<EmptyState icon={Users} title="조직도 데이터가 없습니다" description="실을 추가하여 조직도를 구성해보세요." />
				) : (
					<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
						<SortableContext items={localDivisions.map((d) => d.id)} strategy={verticalListSortingStrategy}>
							{localDivisions.map((division) => {
								const divisionTeams = localTeams.filter((t) => t.division_id === division.id);
								return (
									<SortableDivisionCard
										key={division.id}
										division={division}
										teams={divisionTeams}
										isEditor={isEditor}
										employeeContainers={employeeContainers}
										isDraggingEmployee={isDraggingEmployee}
										onAddTeam={(divId) => openAddTeam(divId)}
										onAddEmployee={(divId, teamId) => openAddEmployee(divId, teamId)}
										onEditDivision={openEditDivision}
										onDeleteDivision={openDeleteDivision}
										onEditTeam={openEditTeam}
										onDeleteTeam={openDeleteTeam}
										onEditEmployee={openEditEmployee}
										onDeleteEmployee={openEditEmployee}
									/>
								);
							})}
						</SortableContext>

						{/* 독립 팀 */}
						{independentTeams.length > 0 && (
							<div className="flex flex-col gap-3">
								<div className="flex items-center gap-2">
									<div className="h-px flex-1 bg-border" />
									<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">독립 팀</span>
									<div className="h-px flex-1 bg-border" />
								</div>
								{independentTeams.map((team) => (
									<TeamBlockContent key={team.id} team={team} employees={employeeContainers[`team:${team.id}`] ?? []} containerId={`team:${team.id}`} isEditor={isEditor} onAddEmployee={(teamId) => openAddEmployee(null, teamId)} onEditTeam={openEditTeam} onDeleteTeam={openDeleteTeam} onEditEmployee={openEditEmployee} onDeleteEmployee={openEditEmployee} />
								))}
							</div>
						)}

						<DragOverlay>
							{activeItem?.type === "DIVISION" && (
								<div
									className="rounded-lg border border-border px-4 py-3 shadow-lg opacity-90"
									style={{
										borderLeftWidth: 4,
										borderLeftColor: activeItem.data.color ?? "#6366f1",
										backgroundColor: (activeItem.data.color ?? "#6366f1") + "0d",
									}}
								>
									<span className="font-bold">{activeItem.data.name}</span>
								</div>
							)}
							{activeItem?.type === "TEAM" && (
								<div className="rounded-md border border-border bg-background/95 px-3 py-2 shadow-lg opacity-90">
									<span className="text-sm font-semibold">{activeItem.data.name}</span>
								</div>
							)}
							{activeItem?.type === "EMPLOYEE" && (
								<div className="flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-2 shadow-lg opacity-90">
									<Avatar className="h-7 w-7 shrink-0">
										<AvatarImage src={activeItem.data.profile_image_url ?? undefined} alt={activeItem.data.name} />
										<AvatarFallback className="text-[10px]">{getInitials(activeItem.data.name)}</AvatarFallback>
									</Avatar>
									<span className="text-sm font-medium">{activeItem.data.name}</span>
								</div>
							)}
						</DragOverlay>
					</DndContext>
				)}
			</div>

			{/* CRUD 다이얼로그 */}
			<DivisionFormDialog open={divisionDialogOpen} onOpenChange={setDivisionDialogOpen} division={editingDivision} />
			<TeamFormDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} team={editingTeam} defaultDivisionId={teamDefaultDivisionId} />
			<EmployeeFormDialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen} employee={editingEmployee} defaultDivisionId={employeeDefaultDivisionId} defaultTeamId={employeeDefaultTeamId} allEmployees={employees} />

			{/* 삭제 다이얼로그 */}
			<DeleteDivisionDialog open={divisionDeleteOpen} onOpenChange={setDivisionDeleteOpen} division={deletingDivision} affectedEmployees={employees.filter((e) => deletingDivision && e.division_id === deletingDivision.id)} />
			<DeleteTeamDialog open={teamDeleteOpen} onOpenChange={setTeamDeleteOpen} team={deletingTeam} affectedEmployees={employees.filter((e) => deletingTeam && e.team_id === deletingTeam.id)} />
		</div>
	);
}
