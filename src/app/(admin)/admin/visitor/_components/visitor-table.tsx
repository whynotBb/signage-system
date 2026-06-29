"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { VisitorFormDialog } from "./visitor-form-dialog";
import { DeleteVisitorDialog } from "./delete-visitor-dialog";
import { PageHeader } from "@/components/composite/page-header";
import { EmptyState } from "@/components/composite/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, MapPin, Pencil, Trash2, Plus, UserCheck, Search } from "lucide-react";
import type { VisitorContent } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type VisitorRow = VisitorContent & {
	profiles: { name: string } | null;
};

type ActiveFilter = "all" | "active" | "inactive";

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function parseVisitorField(raw: string): string[] {
	try {
		if (raw.startsWith("[")) {
			const parsed: unknown = JSON.parse(raw);
			if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
				return parsed;
			}
		}
	} catch {}
	return raw ? [raw] : [];
}

function formatDatetime(iso: string | null | undefined): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return dateStr;
	return date.toLocaleDateString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	});
}

type DisplayStatus = "active" | "scheduled" | "expired" | "always";

function getDisplayStatus(item: VisitorContent): DisplayStatus {
	if (!item.scheduled_start_at && !item.scheduled_end_at) return "always";
	const now = new Date();
	const start = item.scheduled_start_at ? new Date(item.scheduled_start_at) : null;
	const end = item.scheduled_end_at ? new Date(item.scheduled_end_at) : null;
	if (start && start > now) return "scheduled";
	if (end && end < now) return "expired";
	return "active";
}

const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
	active: "표시 중",
	scheduled: "예약 중",
	expired: "기간 만료",
	always: "상시",
};

const DISPLAY_STATUS_VARIANT: Record<DisplayStatus, "default" | "secondary" | "destructive" | "outline"> = {
	active: "default",
	scheduled: "secondary",
	expired: "destructive",
	always: "outline",
};

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchVisitors(): Promise<VisitorRow[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("visitor_contents").select("*, profiles(name)").order("display_order", { ascending: true }).order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []) as VisitorRow[];
}

async function updateDisplayOrder(items: { id: string; display_order: number }[]): Promise<void> {
	const supabase = createClient();
	await Promise.all(items.map(({ id, display_order }) => supabase.from("visitor_contents").update({ display_order }).eq("id", id)));
}

async function toggleActive(id: string, is_active: boolean): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("visitor_contents").update({ is_active }).eq("id", id);
	if (error) throw error;
}

// ── SortableTableRow ──────────────────────────────────────────────────────────

interface SortableRowProps {
	item: VisitorRow;
	canEdit: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onToggleActive: (checked: boolean) => void;
	isTogglePending: boolean;
	isDragDisabled: boolean;
}

function SortableTableRow({ item, canEdit, onEdit, onDelete, onToggleActive, isTogglePending, isDragDisabled }: SortableRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 1 : undefined,
		position: isDragging ? "relative" : undefined,
	};

	const parsedNames = parseVisitorField(item.visitor_name);
	const parsedTitles = parseVisitorField(item.visitor_title);

	return (
		<TableRow ref={setNodeRef} style={style}>
			{/* 드래그 핸들 */}
			<TableCell className="w-8 px-2">
				{isDragDisabled ? (
					<span className="block h-4 w-4" />
				) : (
					<button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing" aria-label="순서 변경 (Space로 선택, 방향키로 이동, Enter로 확정)">
						<GripVertical className="h-4 w-4" />
					</button>
				)}
			</TableCell>

			{/* 방문일 */}
			<TableCell className="hidden sm:table-cell text-sm">{formatDate(item.visit_date)}</TableCell>

			<TableCell className="font-medium">
				<div className="flex flex-col gap-0.5">
					<span>{item.title}</span>
					{/* sm 구간: 방문자 컬럼(md+)이 없으므로 인라인으로 이름만 보완 */}
					<span className="md:hidden text-xs text-muted-foreground font-normal">
						{parsedNames[0]}
						{parsedTitles[0] && ` · ${parsedTitles[0]}`}
					</span>
				</div>
			</TableCell>

			<TableCell className="hidden sm:table-cell">{item.visitor_org}</TableCell>

			<TableCell className="hidden md:table-cell">
				<div className="flex flex-col gap-1">
					{parsedNames.map((name, idx) => (
						<div key={idx} className="flex items-center gap-1.5">
							<span className="font-medium text-foreground">{name}</span>
							<span className="text-xs text-muted-foreground">{parsedTitles[idx] || ""}</span>
						</div>
					))}
				</div>
			</TableCell>

			<TableCell className="hidden lg:table-cell text-sm">{item.location}</TableCell>

			<TableCell>
				<Switch checked={item.is_active} onCheckedChange={onToggleActive} disabled={isTogglePending} aria-label={item.is_active ? "활성" : "비활성"} />
			</TableCell>

			<TableCell className="hidden lg:table-cell tabular-nums text-xs text-muted-foreground">
				{item.scheduled_start_at || item.scheduled_end_at ? (
					<div className="flex flex-col gap-1">
						<Badge variant={DISPLAY_STATUS_VARIANT[getDisplayStatus(item)]} className="w-fit text-xs">
							{DISPLAY_STATUS_LABEL[getDisplayStatus(item)]}
						</Badge>
						<span>{formatDatetime(item.scheduled_start_at)}</span>
						<span>→ {formatDatetime(item.scheduled_end_at)}</span>
					</div>
				) : (
					<Badge variant="outline" className="text-xs">
						상시
					</Badge>
				)}
			</TableCell>

			<TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{item.profiles?.name ?? "—"}</TableCell>

			<TableCell>
				{canEdit && (
					<div className="flex gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="수정">
							<Pencil className="h-3.5 w-3.5" />
						</Button>
						<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="삭제">
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				)}
			</TableCell>
		</TableRow>
	);
}

// ── MobileVisitorCard ─────────────────────────────────────────────────────────

interface MobileVisitorCardProps {
	item: VisitorRow;
	parsedNames: string[];
	parsedTitles: string[];
	canEdit: boolean;
	onEdit: () => void;
	onDelete: () => void;
	onToggleActive: (checked: boolean) => void;
	isTogglePending: boolean;
}

function MobileVisitorCard({ item, parsedNames, parsedTitles, canEdit, onEdit, onDelete, onToggleActive, isTogglePending }: MobileVisitorCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm leading-snug">{item.title}</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						{item.visitor_org} · {parsedNames[0]}
						{parsedTitles[0] && ` ${parsedTitles[0]}`}
					</p>
				</div>
				<Switch checked={item.is_active} onCheckedChange={onToggleActive} disabled={isTogglePending} aria-label={item.is_active ? "활성" : "비활성"} className="shrink-0" />
			</div>
			<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
				{item.visit_date && <span>{formatDate(item.visit_date)}</span>}
				{item.location && (
					<span className="flex items-center gap-0.5">
						<MapPin className="h-3 w-3" aria-hidden="true" />
						{item.location}
					</span>
				)}
				<Badge variant={DISPLAY_STATUS_VARIANT[getDisplayStatus(item)]} className="text-xs">
					{DISPLAY_STATUS_LABEL[getDisplayStatus(item)]}
				</Badge>
			</div>
			{canEdit && (
				<div className="flex gap-1 justify-end">
					<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="수정">
						<Pencil className="h-3.5 w-3.5" />
					</Button>
					<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="삭제">
						<Trash2 className="h-3.5 w-3.5" />
					</Button>
				</div>
			)}
		</div>
	);
}

// ── VisitorTable ─────────────────────────────────────────────────────────────

export function VisitorTable() {
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<VisitorContent | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<VisitorRow | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [searchText, setSearchText] = useState("");
	const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

	const { data: visitorList = [], isLoading } = useQuery({
		queryKey: queryKeys.visitors.all,
		queryFn: fetchVisitors,
	});

	const isFiltering = searchText.trim() !== "" || activeFilter !== "all";

	const filteredList = visitorList.filter((item) => {
		const q = searchText.toLowerCase().trim();
		const matchSearch =
			q === "" ||
			item.title.toLowerCase().includes(q) ||
			item.visitor_name.toLowerCase().includes(q) ||
			item.visitor_org.toLowerCase().includes(q);
		const matchFilter = activeFilter === "all" || (activeFilter === "active" && item.is_active) || (activeFilter === "inactive" && !item.is_active);
		return matchSearch && matchFilter;
	});

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	const reorderMutation = useMutation({
		mutationFn: updateDisplayOrder,
		onError: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all });
			toast.error("순서 저장에 실패했습니다.");
		},
	});

	const toggleActiveMutation = useMutation({
		mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
			setTogglingId(id);
			return toggleActive(id, is_active);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() });
		},
		onError: () => toast.error("상태 변경에 실패했습니다."),
		onSettled: () => setTogglingId(null),
	});

	function canEdit(item: VisitorRow): boolean {
		if (!user) return false;
		if (user.role === "editor") return item.created_by === user.id;
		return true;
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = visitorList.findIndex((item) => item.id === active.id);
		const newIndex = visitorList.findIndex((item) => item.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(visitorList, oldIndex, newIndex);

		// 낙관적 업데이트
		queryClient.setQueryData<VisitorRow[]>(queryKeys.visitors.all, reordered);

		// 서버 동기화
		reorderMutation.mutate(reordered.map((item, index) => ({ id: item.id, display_order: index + 1 })));
	}

	function handleEdit(item: VisitorRow) {
		setEditTarget(item);
		setFormOpen(true);
	}

	function handleCreate() {
		setEditTarget(null);
		setFormOpen(true);
	}

	return (
		<>
			<div className="flex flex-col gap-6">
				<PageHeader title="방문자 관리" description="방문자 정보를 관리하고 사이니지에 표시합니다.">
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
					<EmptyState icon={UserCheck} title="등록된 방문자 공지가 없습니다" description="방문자 등록 버튼을 눌러 첫 번째 방문 공지를 등록하세요." action={{ label: "방문자 등록", onClick: handleCreate }} />
				) : (
					<>
						{/* 검색 + 필터 툴바 */}
						<div className="flex items-center justify-end gap-2">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
								<Input
									placeholder="제목, 방문자, 기관 검색..."
									value={searchText}
									onChange={(e) => setSearchText(e.target.value)}
									className="pl-8 w-[200px]"
								/>
							</div>
							<Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveFilter)}>
								<SelectTrigger className="w-[110px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">전체</SelectItem>
									<SelectItem value="active">활성</SelectItem>
									<SelectItem value="inactive">비활성</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{filteredList.length === 0 ? (
							<p className="py-10 text-center text-sm text-muted-foreground">검색 결과가 없습니다.</p>
						) : (
							<>
								{/* 모바일 카드 뷰 */}
								<div className="sm:hidden flex flex-col gap-2">
									{filteredList.map((item) => {
										const names = parseVisitorField(item.visitor_name);
										const titles = parseVisitorField(item.visitor_title);
										return <MobileVisitorCard key={item.id} item={item} parsedNames={names} parsedTitles={titles} canEdit={canEdit(item)} onEdit={() => handleEdit(item)} onDelete={() => setDeleteTarget(item)} onToggleActive={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })} isTogglePending={togglingId === item.id} />;
									})}
								</div>

								{/* 태블릿/데스크탑 테이블 뷰 */}
								<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
									<div className="hidden sm:block rounded-lg border border-border overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-8 px-2" />
													<TableHead className="hidden sm:table-cell w-[120px]">방문일</TableHead>
													<TableHead className="min-w-[150px]">방문 목적</TableHead>
													<TableHead className="hidden sm:table-cell w-[150px]">방문 기관</TableHead>
													<TableHead className="hidden md:table-cell w-[150px]">방문자</TableHead>
													<TableHead className="hidden lg:table-cell w-[120px]">방문 장소</TableHead>
													<TableHead className="w-[80px]">활성</TableHead>
													<TableHead className="hidden lg:table-cell w-[190px]">게시 기간</TableHead>
													<TableHead className="hidden lg:table-cell w-[100px]">등록자</TableHead>
													<TableHead className="w-[80px]"></TableHead>
												</TableRow>
											</TableHeader>
											<SortableContext items={filteredList.map((item) => item.id)} strategy={verticalListSortingStrategy}>
												<TableBody>
													{filteredList.map((item) => (
														<SortableTableRow key={item.id} item={item} canEdit={canEdit(item)} onEdit={() => handleEdit(item)} onDelete={() => setDeleteTarget(item)} onToggleActive={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })} isTogglePending={togglingId === item.id} isDragDisabled={isFiltering} />
													))}
												</TableBody>
											</SortableContext>
										</Table>
									</div>
								</DndContext>
							</>
						)}
					</>
				)}
			</div>

			<VisitorFormDialog
				open={formOpen}
				onOpenChange={(v) => {
					setFormOpen(v);
					if (!v) setEditTarget(null);
				}}
				visitor={editTarget}
			/>

			{deleteTarget && (
				<DeleteVisitorDialog
					open={!!deleteTarget}
					onOpenChange={(v) => {
						if (!v) setDeleteTarget(null);
					}}
					visitorId={deleteTarget.id}
					title={deleteTarget.title}
				/>
			)}
		</>
	);
}
