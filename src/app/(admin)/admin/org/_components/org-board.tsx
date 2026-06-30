"use client";

import { useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay, useDroppable, closestCenter, defaultDropAnimationSideEffects, type DragEndEvent, type DragStartEvent, type DragOverEvent, type DropAnimation } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { GripVertical, Plus, Trash, Users, ChevronUp, ChevronDown, ArrowDownWideNarrow, Eye } from "lucide-react";
import { OrgPreviewModal } from "./org-preview-modal";
import { toast } from "sonner";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { Division, Team, Employee } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type ContainerId = string; // 'team:{teamId}' | 'div-direct:{divisionId}'

type ActiveItem = { type: "DIVISION"; data: Division } | { type: "TEAM"; data: Team } | { type: "EMPLOYEE"; data: Employee };

type DragHandle = {
	attributes: ReturnType<typeof useSortable>["attributes"];
	listeners: ReturnType<typeof useSortable>["listeners"];
};

// ── Supabase 쿼리 ─────────────────────────────────────────────────────────────

async function fetchDivisions(orgChartId: string): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").eq("org_chart_id", orgChartId).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchTeams(orgChartId: string): Promise<Team[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("teams").select("*").eq("org_chart_id", orgChartId).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchActiveEmployees(orgChartId: string): Promise<Employee[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("employees").select("*").eq("org_chart_id", orgChartId).eq("is_resigned", false).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

// ── display_order 업데이트 ────────────────────────────────────────────────────

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

function isNewEmployee(hiredAt: string): boolean {
	const threeMonthsAgo = new Date();
	threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
	return new Date(hiredAt) > threeMonthsAgo;
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
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
}

function EmployeeRowContent({ employee, isEditor, onEdit, onDelete }: Omit<EmployeeRowProps, "containerId" | "onMoveUp" | "onMoveDown" | "isFirst" | "isLast">) {
	return (
		<>
			<Avatar className="h-7 w-7 shrink-0">
				<AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
				<AvatarFallback className="text-[10px]">{getInitials(employee.name)}</AvatarFallback>
			</Avatar>
			<span className="min-w-0 truncate text-sm font-medium">{employee.name}</span>
			{employee.position && <span className="shrink-0 text-xs text-muted-foreground">{employee.position}</span>}
			{employee.title && <Badge className="shrink-0 border-0 bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{employee.title}</Badge>}
			{employee.is_dispatched && <Badge className="shrink-0 border-0 bg-amber-100 text-[10px] text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">파견</Badge>}
			{isNewEmployee(employee.hired_at) && <Badge className="shrink-0 border-0 bg-purple-100 text-[10px] text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">NEW</Badge>}
			{!isEditor && (
				<div className="flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 ml-auto lg:ml-0">
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

function SortableEmployeeRow({ employee, containerId, isEditor, onEdit, onDelete, onMoveUp, onMoveDown, isFirst, isLast }: EmployeeRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: employee.id,
		data: { type: "EMPLOYEE", containerId },
	});

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition: transition ?? "transform 150ms ease",
		opacity: isDragging ? 0 : 1,
	};

	return (
		<div ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50">
			<div className="flex items-center shrink-0">
				{/* 데스크톱 그립 */}
				<div className="hidden md:flex cursor-grab touch-none items-center" {...attributes} {...listeners}>
					<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
				</div>
				{/* 모바일 화살표 */}
				<div className="flex md:hidden flex-col items-center shrink-0">
					<Button
						variant="ghost"
						size="icon"
						className="h-5 w-5"
						disabled={isFirst}
						onClick={(e) => {
							e.stopPropagation();
							onMoveUp?.();
						}}
						aria-label="위로 이동"
					>
						<ChevronUp className="h-3 w-3" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-5 w-5"
						disabled={isLast}
						onClick={(e) => {
							e.stopPropagation();
							onMoveDown?.();
						}}
						aria-label="아래로 이동"
					>
						<ChevronDown className="h-3 w-3" />
					</Button>
				</div>
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
	showColor?: boolean;
	onAddEmployee?: (teamId: string) => void;
	onEditTeam?: (team: Team) => void;
	onDeleteTeam?: (team: Team) => void;
	onEditEmployee?: (employee: Employee) => void;
	onDeleteEmployee?: (employee: Employee) => void;
	onMoveEmployee?: (containerId: ContainerId, index: number, direction: "up" | "down") => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
	onSortEmployees?: (containerId: ContainerId) => void;
	teamNumber?: number;
	isCollapsed?: boolean;
}

function TeamBlockContent({ team, employees, containerId, isEditor, dragHandle, showColor, onAddEmployee, onEditTeam, onDeleteTeam, onEditEmployee, onDeleteEmployee, onMoveEmployee, onMoveUp, onMoveDown, isFirst, isLast, onSortEmployees, teamNumber, isCollapsed }: TeamBlockProps) {
	const { setNodeRef: setDropRef, isOver } = useDroppable({ id: containerId });
	const color = showColor ? (team.color ?? "#6366f1") : undefined;
	const bgTint = color ? color + "0d" : undefined;

	return (
		<div className="rounded-md border border-border/60 bg-background/80" style={color ? { borderLeftWidth: 4, borderLeftColor: color, backgroundColor: bgTint } : undefined}>
			<div className="flex flex-wrap items-center gap-2 px-3 py-2">
				{/* 독립팀일 때 PC/모바일 화살표 상시 노출 */}
				{!isEditor && !team.division_id && (
					<div className="flex flex-col items-center shrink-0">
						<Button
							variant="ghost"
							size="icon"
							className="h-5 w-5"
							disabled={isFirst}
							onClick={(e) => {
								e.stopPropagation();
								onMoveUp?.();
							}}
							aria-label="위로 이동"
							title="위로 이동"
						>
							<ChevronUp className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-5 w-5"
							disabled={isLast}
							onClick={(e) => {
								e.stopPropagation();
								onMoveDown?.();
							}}
							aria-label="아래로 이동"
							title="아래로 이동"
						>
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>
				)}

				{/* 실 내부의 팀일 때 기존 DND 그립 & 모바일 화살표 노출 */}
				{!isEditor && team.division_id && dragHandle && (
					<>
						{/* 데스크톱 그립 */}
						<div className="hidden md:flex cursor-grab touch-none items-center" {...dragHandle.attributes} {...dragHandle.listeners}>
							<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40 hover:text-muted-foreground" />
						</div>
						{/* 모바일 화살표 */}
						<div className="flex md:hidden flex-col items-center shrink-0">
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5"
								disabled={isFirst}
								onClick={(e) => {
									e.stopPropagation();
									onMoveUp?.();
								}}
								aria-label="위로 이동"
							>
								<ChevronUp className="h-3 w-3" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-5 w-5"
								disabled={isLast}
								onClick={(e) => {
									e.stopPropagation();
									onMoveDown?.();
								}}
								aria-label="아래로 이동"
							>
								<ChevronDown className="h-3 w-3" />
							</Button>
						</div>
					</>
				)}

				{/* 독립팀인 경우 색상 동그라미 및 순서 숫자 표기 */}
				{color && !team.division_id && (
					<div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
						{teamNumber}
					</div>
				)}
				<span className="flex-1 text-sm font-semibold min-w-[120px]">{team.name}</span>
				{!isEditor && (
					<div className="flex items-center gap-1 ml-auto shrink-0 pt-1 sm:pt-0">
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
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSortEmployees?.(containerId)} title="정렬" aria-label="팀원 자동 정렬">
							<ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
						</Button>
					</div>
				)}
			</div>
			{/* 독립팀이고 접혀있는 상태가 아닐 때만 노출 (또는 실에 속한 일반 팀일 때 노출) */}
			{!(isCollapsed && !team.division_id) && (
				<div ref={setDropRef} className={cn("min-h-[32px] border-t border-border/40 px-2 py-1 transition-colors", isOver && "bg-primary/5 ring-1 ring-inset ring-primary/30")}>
					<SortableContext items={employees.map((e) => e.id)} strategy={verticalListSortingStrategy}>
						{employees.map((employee, index) => (
							<SortableEmployeeRow key={employee.id} employee={employee} containerId={containerId} isEditor={isEditor} onEdit={onEditEmployee} onDelete={onDeleteEmployee} onMoveUp={() => onMoveEmployee?.(containerId, index, "up")} onMoveDown={() => onMoveEmployee?.(containerId, index, "down")} isFirst={index === 0} isLast={index === employees.length - 1} />
						))}
					</SortableContext>
					{employees.length === 0 && <div className={cn("py-1.5 text-center text-xs text-muted-foreground/50 transition-colors", isOver && "text-primary/60")}>{isOver ? "여기에 드롭" : "직원 없음"}</div>}
				</div>
			)}
		</div>
	);
}

function SortableTeamBlock(props: TeamBlockProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.team.id,
		disabled: !props.team.division_id,
		data: { type: "TEAM", divisionId: props.team.division_id },
	});

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition: transition ?? "transform 150ms ease",
		opacity: isDragging ? 0 : 1,
		zIndex: isDragging ? 10 : undefined,
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
	onMoveEmployee?: (containerId: ContainerId, index: number, direction: "up" | "down") => void;
	onMoveInnerTeam?: (divisionId: string, index: number, direction: "up" | "down") => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
	onSortEmployees?: (containerId: ContainerId) => void;
	divisionNumber?: number;
	isCollapsed?: boolean;
}

function DivisionCardContent({ division, teams, isEditor, dragHandle: _, employeeContainers, isDraggingEmployee, onAddTeam, onAddEmployee, onEditDivision, onDeleteDivision, onEditTeam, onDeleteTeam, onEditEmployee, onDeleteEmployee, onMoveEmployee, onMoveInnerTeam, onMoveUp, onMoveDown, isFirst, isLast, onSortEmployees, divisionNumber, isCollapsed }: DivisionCardProps) {
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
			<div className="flex flex-wrap items-center gap-2 px-3 py-3">
				{!isEditor && (
					<div className="flex flex-col items-center shrink-0">
						<Button
							variant="ghost"
							size="icon"
							className="h-5 w-5"
							disabled={isFirst}
							onClick={(e) => {
								e.stopPropagation();
								onMoveUp?.();
							}}
							aria-label="위로 이동"
							title="위로 이동"
						>
							<ChevronUp className="h-3 w-3" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-5 w-5"
							disabled={isLast}
							onClick={(e) => {
								e.stopPropagation();
								onMoveDown?.();
							}}
							aria-label="아래로 이동"
							title="아래로 이동"
						>
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>
				)}
				<div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
					{divisionNumber}
				</div>
				<span className="flex-1 text-base font-bold min-w-[120px]">{division.name}</span>
				{!isEditor && (
					<div className="flex items-center gap-1 ml-auto shrink-0 pt-1 sm:pt-0">
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

			{/* 팀 블록 + 직속 직원 (접혀있는 상태가 아닐 때만 렌더링) */}
			{!isCollapsed && (teams.length > 0 || showDirectSection) && (
				<div className="flex flex-col gap-2 px-4 pb-3">
					{/* 실 직속 (첫 번째로 렌더링) */}
					{showDirectSection && (
						<div ref={setDirectDropRef} className={cn("rounded-md border border-dashed border-border/60 bg-background/50 transition-colors", isDirectOver && "border-primary/40 bg-primary/5")}>
							<div className="px-3 py-1.5 flex items-center justify-between">
								<span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">실 직속</span>
								{!isEditor && (
									<Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onSortEmployees?.(directContainerId)} title="정렬" aria-label="직속 직원 정렬">
										<ArrowDownWideNarrow className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
									</Button>
								)}
							</div>
							<div className="border-t border-border/40 px-2 py-1">
								<SortableContext items={directEmployees.map((e) => e.id)} strategy={verticalListSortingStrategy}>
									{directEmployees.map((employee, index) => (
										<SortableEmployeeRow key={employee.id} employee={employee} containerId={directContainerId} isEditor={isEditor} onEdit={onEditEmployee} onDelete={onDeleteEmployee} onMoveUp={() => onMoveEmployee?.(directContainerId, index, "up")} onMoveDown={() => onMoveEmployee?.(directContainerId, index, "down")} isFirst={index === 0} isLast={index === directEmployees.length - 1} />
									))}
								</SortableContext>
								{directEmployees.length === 0 && <div className={cn("py-1.5 text-center text-xs text-muted-foreground/50 transition-colors", isDirectOver && "text-primary/60")}>{isDirectOver ? "여기에 드롭" : "직원을 드래그해 추가"}</div>}
							</div>
						</div>
					)}

					{/* 팀 블록 (두 번째로 렌더링) */}
					{teams.length > 0 && (
						<SortableContext items={teams.map((t) => t.id)} strategy={verticalListSortingStrategy}>
							{teams.map((team, index) => (
								<SortableTeamBlock
									key={team.id}
									team={team}
									employees={employeeContainers[`team:${team.id}`] ?? []}
									containerId={`team:${team.id}`}
									isEditor={isEditor}
									onAddEmployee={(teamId) => onAddEmployee?.(division.id, teamId)}
									onEditTeam={onEditTeam}
									onDeleteTeam={onDeleteTeam}
									onEditEmployee={onEditEmployee}
									onDeleteEmployee={onDeleteEmployee}
									onMoveEmployee={onMoveEmployee}
									onMoveUp={() => onMoveInnerTeam?.(division.id, index, "up")}
									onMoveDown={() => onMoveInnerTeam?.(division.id, index, "down")}
									isFirst={index === 0}
									isLast={index === teams.length - 1}
									onSortEmployees={onSortEmployees}
								/>
							))}
						</SortableContext>
					)}
				</div>
			)}
		</div>
	);
}

function SortableDivisionCard(props: DivisionCardProps) {
	const { setNodeRef, transform, transition } = useSortable({
		id: props.division.id,
		disabled: true,
		data: { type: "DIVISION" },
	});

	const style: React.CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition: transition ?? "transform 150ms ease",
	};

	return (
		<div ref={setNodeRef} style={style}>
			<DivisionCardContent {...props} dragHandle={undefined} />
		</div>
	);
}

// ── 대표이사/부사장 카드 ──────────────────────────────────────────────────────────

function RepresentativeCard({ employee, label, isEditor, onAssign, onEdit }: { employee: Employee | null; label: string; isEditor: boolean; onAssign?: () => void; onEdit?: (employee: Employee) => void }) {
	const isRep = label === "대표이사";

	if (!employee) {
		return (
			<div className="flex w-full sm:max-w-[260px] items-center gap-4 rounded-lg border border-dashed border-border p-3">
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
		<div className="flex w-full sm:max-w-[260px] items-center gap-4 rounded-lg border border-border bg-card p-3 shadow-sm">
			{isRep ? (
				<div className="h-[56px] w-[49px] shrink-0 overflow-hidden rounded-md bg-muted border border-border/50 flex items-center justify-center">
					{employee.profile_image_url ? (
						// eslint-disable-next-line @next/next/no-img-element
						<img src={employee.profile_image_url} alt={employee.name} className="h-full w-full object-cover object-top" />
					) : (
						<span className="text-sm font-medium text-muted-foreground">{getInitials(employee.name)}</span>
					)}
				</div>
			) : (
				<Avatar className="h-12 w-12 shrink-0">
					<AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
					<AvatarFallback className="text-base">{getInitials(employee.name)}</AvatarFallback>
				</Avatar>
			)}
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

// ── 안정적인 빈 배열 참조 (= [] 기본값은 매 렌더마다 새 참조를 생성해 useEffect 무한 루프 유발) ──
const EMPTY_DIVISIONS: Division[] = [];
const EMPTY_TEAMS: Team[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];

const dropAnimation: DropAnimation = {
	duration: 180,
	easing: "cubic-bezier(0.25, 1, 0.5, 1)",
	sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } }),
};

// ── OrgBoard 메인 컴포넌트 ───────────────────────────────────────────────────

interface OrgBoardProps {
	orgChartId: string;
	orgChartName: string;
	isDisplayActive: boolean;
}

export function OrgBoard({ orgChartId, orgChartName, isDisplayActive }: OrgBoardProps) {
	const user = useAuthStore((s) => s.user);
	const queryClient = useQueryClient();
	const isEditor = user?.role === "editor";
	const [previewOpen, setPreviewOpen] = useState(false);

	const { data: divisions = EMPTY_DIVISIONS, isLoading: divisionsLoading } = useQuery({
		queryKey: queryKeys.divisions.byOrgChart(orgChartId),
		queryFn: () => fetchDivisions(orgChartId),
	});
	const { data: teams = EMPTY_TEAMS, isLoading: teamsLoading } = useQuery({
		queryKey: queryKeys.teams.byOrgChart(orgChartId),
		queryFn: () => fetchTeams(orgChartId),
	});
	const { data: employees = EMPTY_EMPLOYEES, isLoading: employeesLoading } = useQuery({
		queryKey: queryKeys.employees.byOrgChart(orgChartId),
		queryFn: () => fetchActiveEmployees(orgChartId),
	});

	const isLoading = divisionsLoading || teamsLoading || employeesLoading;

	// ── 낙관적 순서 상태 ─────────────────────────────────────────────────────
	const [localDivisions, setLocalDivisions] = useState<Division[]>(divisions);
	const [isCollapsed, setIsCollapsed] = useState(false);
	const [localTeams, setLocalTeams] = useState<Team[]>(teams);

	// ── 직원 컨테이너 상태 (크로스 컨테이너 DnD) ─────────────────────────────
	const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);
	// onDragOver 낙관적 업데이트로 active.data가 바뀌기 전 원래 컨테이너 ID 보존
	const dragStartContainerRef = useRef<ContainerId | null>(null);

	// DnD 중이 아닐 때 서버 데이터와 동기화 (render-time 파생 상태 패턴 — react-hooks/set-state-in-effect 회피)
	const [prevDivisions, setPrevDivisions] = useState(divisions);
	const [prevTeams, setPrevTeams] = useState(teams);
	if (!activeItem && prevDivisions !== divisions) {
		setPrevDivisions(divisions);
		setLocalDivisions(divisions);
	}
	if (!activeItem && prevTeams !== teams) {
		setPrevTeams(teams);
		setLocalTeams(teams);
	}

	// 서버 데이터로부터 직원 컨테이너 구조 계산 (순수 파생값 — 부수 효과 없음)
	const baseContainers = useMemo<Record<string, Employee[]>>(() => {
		const containers: Record<string, Employee[]> = {};
		teams.forEach((t) => {
			containers[`team:${t.id}`] = [];
		});
		divisions.forEach((d) => {
			containers[`div-direct:${d.id}`] = [];
		});
		employees
			.filter((e) => e.org_role === "member" || e.org_role === "ai")
			.forEach((e) => {
				if (e.team_id && `team:${e.team_id}` in containers) {
					containers[`team:${e.team_id}`].push(e);
				} else if (e.division_id && `div-direct:${e.division_id}` in containers) {
					containers[`div-direct:${e.division_id}`].push(e);
				}
			});
		return containers;
	}, [employees, teams, divisions]);

	// DnD 낙관적 업데이트용 상태 (직원 드래그 중에만 non-null)
	const [dndContainers, setDndContainers] = useState<Record<string, Employee[]> | null>(null);
	// 서버 데이터가 새로 도착하면 DnD 상태 초기화 (render-time 파생 상태 패턴)
	const [prevBaseContainers, setPrevBaseContainers] = useState(baseContainers);
	if (prevBaseContainers !== baseContainers) {
		setPrevBaseContainers(baseContainers);
		setDndContainers(null);
	}
	const employeeContainers = dndContainers ?? baseContainers;

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
	const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
	const [employeeDeleteOpen, setEmployeeDeleteOpen] = useState(false);

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
	// 총 열 수 계산 함수 (14열 제한용)
	const calculateTotalColumns = () => {
		const divs = localDivisions.map((d) => ({ type: "DIVISION" as const, id: d.id, display_order: d.display_order ?? 0, item: d }));
		const indTeams = localTeams.filter((t) => !t.division_id).map((t) => ({ type: "TEAM" as const, id: t.id, display_order: t.display_order ?? 0, item: t }));
		const mixed = [...divs, ...indTeams].sort((a, b) => a.display_order - b.display_order);

		return mixed.reduce((acc, block) => {
			if (block.type === "DIVISION") {
				const division = block.item as Division;
				const divisionTeams = localTeams.filter((t) => t.division_id === division.id);
				const directEmps = employees.filter((e) => e.division_id === division.id && !e.team_id && (e.org_role === "member" || e.org_role === "ai"));
				const hasTeams = divisionTeams.length > 0;
				// 실장/소장 등 제외한 실 직속 멤버들
				const headTitles = ["실장", "소장", "연구소장"];
				const head = directEmps.find((e) => headTitles.includes(e.title)) ?? null;
				const directMembers = directEmps.filter((e) => e !== head);

				if (hasTeams) {
					const divTeamsCols = divisionTeams.reduce((tAcc: number, team: Team) => {
						const teamMembers = employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
						return tAcc + (teamMembers.length >= 10 ? 2 : 1);
					}, 0);
					return acc + divTeamsCols;
				} else {
					if (directMembers.length > 0) {
						return acc + (directMembers.length >= 10 ? 2 : 1);
					}
					return acc + 1;
				}
			} else {
				const team = block.item as Team;
				const teamMembers = employees.filter((e) => e.team_id === team.id && (e.org_role === "member" || e.org_role === "ai"));
				return acc + (teamMembers.length >= 10 ? 2 : 1);
			}
		}, 0);
	};

	function openAddTeam(divisionId?: string | null) {
		const totalCols = calculateTotalColumns();
		if (totalCols >= 12) {
			toast.error(`12열 이상 조직도를 구성할 수 없습니다. (*1팀당 1열, 10명 이상인 경우 2열로 구성됨) 담당자 문의 : whynot@hubilon.com`);
			return;
		}
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
	const MAX_TEAM_MEMBERS = 19;

	function openAddEmployee(divisionId?: string | null, teamId?: string | null) {
		const teamMemberCount = employees.filter(
			(e) => e.org_role !== "representative" && e.org_role !== "vice_representative"
		).length;
		if (teamMemberCount >= MAX_TEAM_MEMBERS) {
			toast.error("팀원 추가 불가", {
				description: `팀원은 최대 ${MAX_TEAM_MEMBERS}명까지 등록할 수 있습니다. 추가 등록이 필요하시면 whynot@hubilon.com으로 문의해 주세요.`,
			});
			return;
		}
		setEditingEmployee(null);
		setEmployeeDefaultDivisionId(divisionId ?? null);
		setEmployeeDefaultTeamId(teamId ?? null);
		setEmployeeDialogOpen(true);
	}

	function openAssignRepresentative() {
		setEditingEmployee(null);
		setEmployeeDefaultDivisionId(null);
		setEmployeeDefaultTeamId(null);
		setEmployeeDialogOpen(true);
	}
	function openEditEmployee(employee: Employee) {
		setEditingEmployee(employee);
		setEmployeeDefaultDivisionId(null);
		setEmployeeDefaultTeamId(null);
		setEmployeeDialogOpen(true);
	}
	function openDeleteEmployee(employee: Employee) {
		setDeletingEmployee(employee);
		setEmployeeDeleteOpen(true);
	}
	async function handleDeleteEmployee() {
		if (!deletingEmployee) return;
		const supabase = createClient();
		const { error } = await supabase.from("employees").update({ is_resigned: true }).eq("id", deletingEmployee.id);
		if (error) {
			toast.error("직원 삭제(퇴사 처리)에 실패했습니다.");
		} else {
			toast.success(`"${deletingEmployee.name}" 직원이 퇴사(삭제) 처리되었습니다.`);
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.byOrgChart(orgChartId) });
			setEmployeeDeleteOpen(false);
		}
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

		// useSortable data는 불변이므로 active.data.current.containerId 직접 수정 불가
		// → onDragEnd에서 최종 컨테이너를 employeeContainers에서 다시 조회
		setDndContainers((prev) => {
			const current = prev ?? baseContainers;
			const employee = current[fromContainer]?.find((e) => e.id === active.id);
			if (!employee) return prev;
			return {
				...current,
				[fromContainer]: current[fromContainer].filter((e) => e.id !== active.id),
				[toContainer]: [...(current[toContainer] ?? []), employee],
			};
		});
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		setActiveItem(null);
		if (!over) {
			if (active.data.current?.type === "EMPLOYEE") setDndContainers(null);
			return;
		}

		const activeType = active.data.current?.type as string | undefined;

		if (activeType === "DIVISION" || (activeType === "TEAM" && !active.data.current?.divisionId)) {
			const oldIndex = topLevelItems.findIndex((x) => x.id === active.id);
			const newIndex = topLevelItems.findIndex((x) => x.id === over.id);
			if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

			const reorderedItems = arrayMove(topLevelItems, oldIndex, newIndex);

			const updatedDivisions: Division[] = [];
			const updatedIndependentTeams: Team[] = [];

			reorderedItems.forEach((item, index) => {
				const newOrder = index + 1;
				if (item.type === "DIVISION") {
					updatedDivisions.push({ ...item.item, display_order: newOrder });
				} else {
					updatedIndependentTeams.push({ ...item.item, display_order: newOrder });
				}
			});

			setLocalDivisions(updatedDivisions.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));

			const updatedLocalTeams = [...localTeams.filter((t) => t.division_id !== null), ...updatedIndependentTeams];
			setLocalTeams(updatedLocalTeams);

			const supabase = createClient();
			const updatePromises: Promise<void>[] = [];

			if (updatedDivisions.length > 0) {
				updatePromises.push(
					(async () => {
						const { error } = await supabase.from("divisions").upsert(updatedDivisions);
						if (error) throw error;
					})(),
				);
			}
			if (updatedIndependentTeams.length > 0) {
				updatePromises.push(
					(async () => {
						const { error } = await supabase.from("teams").upsert(updatedIndependentTeams);
						if (error) throw error;
					})(),
				);
			}

			Promise.all(updatePromises).then(() => {
				queryClient.invalidateQueries({ queryKey: queryKeys.divisions.byOrgChart(orgChartId) });
				queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOrgChart(orgChartId) });
			});
			return;
		}

		if (activeType === "TEAM") {
			const divisionId = active.data.current?.divisionId as string;
			const divTeams = localTeams.filter((t) => t.division_id === divisionId);
			const oldIndex = divTeams.findIndex((t) => t.id === active.id);
			const newIndex = divTeams.findIndex((t) => t.id === over.id);
			if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
			const reordered = arrayMove(divTeams, oldIndex, newIndex);
			const updatedLocalTeams = [...localTeams.filter((t) => t.division_id !== divisionId), ...reordered];
			setLocalTeams(updatedLocalTeams);
			updateTeamOrders(reordered).then(() => {
				queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOrgChart(orgChartId) });
			});
			return;
		}

		if (activeType === "EMPLOYEE") {
			// onDragOver에서 이미 낙관적 이동 완료 → 최종 컨테이너 확인
			const toContainer = findContainer(over.id as string, employeeContainers);
			if (!toContainer) {
				setDndContainers(null);
				return;
			}

			// dragStartContainerRef 사용: onDragOver 낙관적 업데이트 후 active.data가 바뀌기 때문
			const fromContainer = (dragStartContainerRef.current ?? active.data.current?.containerId) as string;
			dragStartContainerRef.current = null;

			if (fromContainer === toContainer) {
				// 같은 컨테이너 내 정렬
				const containerEmps = employeeContainers[toContainer] ?? [];
				const oldIndex = containerEmps.findIndex((e) => e.id === active.id);
				const newIndex = containerEmps.findIndex((e) => e.id === over.id);
				if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
					setDndContainers(null);
					return;
				}
				const reordered = arrayMove(containerEmps, oldIndex, newIndex);
				setDndContainers((prev) => ({ ...(prev ?? baseContainers), [toContainer]: reordered }));
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
					queryClient.invalidateQueries({ queryKey: queryKeys.employees.byOrgChart(orgChartId) });
				});
			}
		}
	}
	function moveTopLevelItem(index: number, direction: "up" | "down") {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= topLevelItems.length) return;

		const reorderedItems = arrayMove(topLevelItems, index, newIndex);

		const updatedDivisions: Division[] = [];
		const updatedIndependentTeams: Team[] = [];

		reorderedItems.forEach((item, idx) => {
			const newOrder = idx + 1;
			if (item.type === "DIVISION") {
				updatedDivisions.push({ ...item.item, display_order: newOrder });
			} else {
				updatedIndependentTeams.push({ ...item.item, display_order: newOrder });
			}
		});

		setLocalDivisions(updatedDivisions.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)));

		const updatedLocalTeams = [...localTeams.filter((t) => t.division_id !== null), ...updatedIndependentTeams];
		setLocalTeams(updatedLocalTeams);

		const supabase = createClient();
		const updatePromises: Promise<void>[] = [];

		if (updatedDivisions.length > 0) {
			updatePromises.push(
				(async () => {
					const { error } = await supabase.from("divisions").upsert(updatedDivisions);
					if (error) throw error;
				})(),
			);
		}
		if (updatedIndependentTeams.length > 0) {
			updatePromises.push(
				(async () => {
					const { error } = await supabase.from("teams").upsert(updatedIndependentTeams);
					if (error) throw error;
				})(),
			);
		}

		Promise.all(updatePromises).then(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.divisions.byOrgChart(orgChartId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOrgChart(orgChartId) });
		});
	}

	function moveInnerTeam(divisionId: string, index: number, direction: "up" | "down") {
		const divTeams = localTeams.filter((t) => t.division_id === divisionId);
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= divTeams.length) return;

		const reordered = arrayMove(divTeams, index, newIndex);
		const updatedLocalTeams = [...localTeams.filter((t) => t.division_id !== divisionId), ...reordered];
		setLocalTeams(updatedLocalTeams);
		updateTeamOrders(reordered).then(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOrgChart(orgChartId) });
		});
	}

	function moveEmployee(containerId: ContainerId, index: number, direction: "up" | "down") {
		const containerEmps = employeeContainers[containerId] ?? [];
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= containerEmps.length) return;

		const reordered = arrayMove(containerEmps, index, newIndex);
		setDndContainers((prev) => ({ ...(prev ?? baseContainers), [containerId]: reordered }));
		updateEmployeeOrders(reordered).then(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.byOrgChart(orgChartId) });
		});
	}

	const POSITION_RANK: Record<string, number> = {
		대표이사: 9,
		부사장: 8,
		이사: 7,
		부장: 6,
		차장: 5,
		과장: 4,
		대리: 3,
		주임: 2,
		사원: 1,
		에이전트: 0,
	};
	function getPositionRank(pos?: string | null): number {
		if (!pos) return -1;
		return POSITION_RANK[pos] ?? -1;
	}

	function compareEmployees(a: Employee, b: Employee): number {
		// 1. 팀장 우선
		const isALeader = a.title === "팀장" || a.title === "실장";
		const isBLeader = b.title === "팀장" || b.title === "실장";
		if (isALeader && !isBLeader) return -1;
		if (!isALeader && isBLeader) return 1;

		// 2. 직위 높은 순서
		const rankA = getPositionRank(a.position);
		const rankB = getPositionRank(b.position);
		if (rankA !== rankB) {
			return rankB - rankA;
		}

		// 3. 입사일 오래된 순서 (오름차순)
		const timeA = a.hired_at ? new Date(a.hired_at).getTime() : Infinity;
		const timeB = b.hired_at ? new Date(b.hired_at).getTime() : Infinity;
		if (timeA !== timeB) {
			return timeA - timeB;
		}

		// 4. ㄱ~ㅎ 순서
		return a.name.localeCompare(b.name, "ko");
	}

	function sortEmployees(containerId: ContainerId) {
		const containerEmps = employeeContainers[containerId] ?? [];
		if (containerEmps.length <= 1) return;

		const sorted = [...containerEmps].sort(compareEmployees);

		setDndContainers((prev) => ({ ...(prev ?? baseContainers), [containerId]: sorted }));

		updateEmployeeOrders(sorted).then(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.byOrgChart(orgChartId) });
			toast.success("팀원이 정렬되었습니다.");
		});
	}

	// ── 파생 데이터 ──────────────────────────────────────────────────────────
	const representative = employees.find((e) => e.org_role === "representative") ?? null;
	const viceRepresentative = employees.find((e) => e.org_role === "vice_representative") ?? null;
	const independentTeams = localTeams.filter((t) => !t.division_id);
	const topLevelItems = (() => {
		const divs = localDivisions.map((d) => ({ type: "DIVISION" as const, id: d.id, display_order: d.display_order ?? 0, item: d }));
		const indTeams = independentTeams.map((t) => ({ type: "TEAM" as const, id: t.id, display_order: t.display_order ?? 0, item: t }));
		return [...divs, ...indTeams].sort((a, b) => a.display_order - b.display_order);
	})();
	const isDraggingEmployee = activeItem?.type === "EMPLOYEE";

	if (isLoading) return <OrgBoardSkeleton />;

	return (
		<div className="flex flex-col gap-6">
			{/* PageHeader */}
			<PageHeader
				title={
					<span className="flex items-center gap-2 flex-wrap">
						{orgChartName}
						<Button variant="outline" size="sm" className="gap-1.5 font-normal text-xs h-7 px-2" onClick={() => setPreviewOpen(true)}>
							<Eye className="h-3.5 w-3.5" />
							미리보기
						</Button>
						{isDisplayActive && <Badge className="border-0 bg-primary/10 text-xs text-primary font-normal">표출 중</Badge>}
					</span>
				}
				description="사이니지에 표시할 조직도를 관리합니다."
			>
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

			{/* 대표이사/부사장 */}
			<div className="rounded-lg border border-border/50 p-4">
				<p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">대표이사 · 부사장</p>
				<div className="flex flex-col gap-3 sm:flex-row">
					<RepresentativeCard employee={representative} label="대표이사" isEditor={isEditor} onAssign={openAssignRepresentative} onEdit={openEditEmployee} />
					<RepresentativeCard employee={viceRepresentative} label="부사장" isEditor={isEditor} onAssign={openAssignRepresentative} onEdit={openEditEmployee} />
				</div>
			</div>

			{/* 조직 구조 — 단일 DndContext */}
			<div className="flex flex-col gap-4">
				{localDivisions.length === 0 && independentTeams.length === 0 ? (
					<EmptyState icon={Users} title="조직도 데이터가 없습니다" description="실을 추가하여 조직도를 구성해보세요." />
				) : (
					<div className="flex flex-col gap-3">
						{/* 접기/펼치기 제어 바 */}
						<div className="flex items-center justify-between px-1">
							<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">조직 구조</p>
							<Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40" onClick={() => setIsCollapsed(!isCollapsed)}>
								{isCollapsed ? (
									<>
										<ChevronDown className="h-3.5 w-3.5" />
										전체 펼치기
									</>
								) : (
									<>
										<ChevronUp className="h-3.5 w-3.5" />
										전체 접기
									</>
								)}
							</Button>
						</div>

						<DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
							<div className="flex flex-col gap-4">
								<SortableContext items={topLevelItems.map((x) => x.id)} strategy={verticalListSortingStrategy}>
									{topLevelItems.map((item) => {
										const fullIndex = topLevelItems.findIndex((x) => x.id === item.id);
										const isFirst = fullIndex === 0;
										const isLast = fullIndex === topLevelItems.length - 1;

										if (item.type === "DIVISION") {
											const division = item.item as Division;
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
													onDeleteEmployee={openDeleteEmployee}
													onMoveEmployee={moveEmployee}
													onMoveInnerTeam={moveInnerTeam}
													onMoveUp={() => moveTopLevelItem(fullIndex, "up")}
													onMoveDown={() => moveTopLevelItem(fullIndex, "down")}
													isFirst={isFirst}
													isLast={isLast}
													onSortEmployees={sortEmployees}
													divisionNumber={fullIndex + 1}
													isCollapsed={isCollapsed}
												/>
											);
										} else {
											const team = item.item as Team;
											return (
												<SortableTeamBlock
													key={team.id}
													team={team}
													employees={employeeContainers[`team:${team.id}`] ?? []}
													containerId={`team:${team.id}`}
													isEditor={isEditor}
													showColor
													onAddEmployee={(teamId) => openAddEmployee(null, teamId)}
													onEditTeam={openEditTeam}
													onDeleteTeam={openDeleteTeam}
													onEditEmployee={openEditEmployee}
													onDeleteEmployee={openDeleteEmployee}
													onMoveEmployee={moveEmployee}
													onMoveUp={() => moveTopLevelItem(fullIndex, "up")}
													onMoveDown={() => moveTopLevelItem(fullIndex, "down")}
													isFirst={isFirst}
													isLast={isLast}
													onSortEmployees={sortEmployees}
													teamNumber={fullIndex + 1}
													isCollapsed={isCollapsed}
												/>
											);
										}
									})}
								</SortableContext>
							</div>

							<DragOverlay dropAnimation={dropAnimation}>
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
					</div>
				)}
			</div>

			{/* CRUD 다이얼로그 */}
			<DivisionFormDialog open={divisionDialogOpen} onOpenChange={setDivisionDialogOpen} division={editingDivision} orgChartId={orgChartId} />
			<TeamFormDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} team={editingTeam} defaultDivisionId={teamDefaultDivisionId} orgChartId={orgChartId} />
			<EmployeeFormDialog open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen} employee={editingEmployee} defaultDivisionId={employeeDefaultDivisionId} defaultTeamId={employeeDefaultTeamId} allEmployees={employees} orgChartId={orgChartId} />

			{/* 삭제 다이얼로그 */}
			<DeleteDivisionDialog open={divisionDeleteOpen} onOpenChange={setDivisionDeleteOpen} division={deletingDivision} affectedEmployees={employees.filter((e) => deletingDivision && e.division_id === deletingDivision.id)} orgChartId={orgChartId} />
			<DeleteTeamDialog open={teamDeleteOpen} onOpenChange={setTeamDeleteOpen} team={deletingTeam} affectedEmployees={employees.filter((e) => deletingTeam && e.team_id === deletingTeam.id)} orgChartId={orgChartId} />

			{/* 직원 삭제 대화상자 */}
			<AlertDialog open={employeeDeleteOpen} onOpenChange={setEmployeeDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>직원을 삭제(퇴사)하시겠습니까?</AlertDialogTitle>
						<AlertDialogDescription>&quot;{deletingEmployee?.name}&quot; 직원을 퇴사 처리합니다. 이 작업은 되돌릴 수 없으며, 퇴사자 관리 메뉴에서만 조회 및 복구가 가능합니다.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>취소</AlertDialogCancel>
						<AlertDialogAction onClick={handleDeleteEmployee} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							삭제
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* 조직도 미리보기 모달 */}
			<OrgPreviewModal
				open={previewOpen}
				onOpenChange={setPreviewOpen}
				orgChartId={orgChartId}
				orgChartName={orgChartName}
			/>
		</div>
	);
}
