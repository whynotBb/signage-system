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
import { VideoFormDialog } from "./video-form-dialog";
import { DeleteVideoDialog } from "./delete-video-dialog";
import { PageHeader } from "@/components/composite/page-header";
import { EmptyState } from "@/components/composite/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Pencil, Trash2, Plus, Video, Search, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { SignagePreviewModal } from "@/components/composite/signage-preview-modal";
import { VideoSlide } from "@/components/display/slides/VideoSlide";
import type { VideoContent } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type VideoRow = VideoContent & {
	profiles: { name: string } | null;
};

type ActiveFilter = "all" | "active" | "inactive";

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function getFileNameFromUrl(url: string | null | undefined): string {
	if (!url) return "—";
	try {
		const decoded = decodeURIComponent(url.split("?")[0]);
		return decoded.split("/").pop() ?? "—";
	} catch {
		return "—";
	}
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchVideos(): Promise<VideoRow[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("video_contents").select("*, profiles(name)").order("display_order", { ascending: true }).order("created_at", { ascending: true });
	if (error) throw error;
	return (data ?? []) as VideoRow[];
}

async function updateDisplayOrder(items: { id: string; display_order: number }[]): Promise<void> {
	const supabase = createClient();
	await Promise.all(items.map(({ id, display_order }) => supabase.from("video_contents").update({ display_order }).eq("id", id)));
}

async function toggleActive(id: string, is_active: boolean): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("video_contents").update({ is_active }).eq("id", id);
	if (error) throw error;
}

// ── SortableTableRow ──────────────────────────────────────────────────────────

interface SortableRowProps {
	item: VideoRow;
	canEdit: boolean;
	onPreview: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onToggleActive: (checked: boolean) => void;
	isTogglePending: boolean;
	isDragDisabled: boolean;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
}

function SortableTableRow({ item, canEdit, onPreview, onEdit, onDelete, onToggleActive, isTogglePending, isDragDisabled, onMoveUp, onMoveDown, isFirst, isLast }: SortableRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 1 : undefined,
		position: isDragging ? "relative" : undefined,
	};

	return (
		<TableRow ref={setNodeRef} style={style}>
			<TableCell className="w-16 md:w-8 px-2">
				{isDragDisabled ? (
					<span className="block h-4 w-4" />
				) : (
					<div className="flex items-center gap-1">
						<button {...attributes} {...listeners} className="hidden md:inline-flex cursor-grab touch-none text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing" aria-label="순서 변경">
							<GripVertical className="h-4 w-4" />
						</button>
						<div className="flex md:hidden flex-col items-center">
							<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} aria-label="위로 이동">
								<ChevronUp className="h-3 w-3" />
							</Button>
							<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} aria-label="아래로 이동">
								<ChevronDown className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}
			</TableCell>

			<TableCell>
				<span className="font-medium">{item.title}</span>
			</TableCell>

			<TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px]">
				<span className="block truncate">{getFileNameFromUrl(item.video_url)}</span>
			</TableCell>

			<TableCell>
				<Switch checked={item.is_active} onCheckedChange={onToggleActive} disabled={isTogglePending} aria-label={item.is_active ? "활성" : "비활성"} />
			</TableCell>

			<TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
				{item.profiles?.name ?? "—"}
			</TableCell>

			<TableCell>
				<div className="flex gap-1">
					<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onPreview} title="미리보기">
						<Eye className="h-3.5 w-3.5" />
					</Button>
					{canEdit && (
						<>
							<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="수정">
								<Pencil className="h-3.5 w-3.5" />
							</Button>
							<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="삭제">
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</>
					)}
				</div>
			</TableCell>
		</TableRow>
	);
}

// ── MobileVideoCard ────────────────────────────────────────────────────────────

interface MobileVideoCardProps {
	item: VideoRow;
	canEdit: boolean;
	onPreview: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onToggleActive: (checked: boolean) => void;
	isTogglePending: boolean;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
}

function MobileVideoCard({ item, canEdit, onPreview, onEdit, onDelete, onToggleActive, isTogglePending, onMoveUp, onMoveDown, isFirst, isLast }: MobileVideoCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<p className="font-medium text-sm leading-snug truncate">{item.title}</p>
					<p className="text-xs text-muted-foreground mt-0.5 truncate">{getFileNameFromUrl(item.video_url)}</p>
				</div>
				<Switch checked={item.is_active} onCheckedChange={onToggleActive} disabled={isTogglePending} aria-label={item.is_active ? "활성" : "비활성"} className="shrink-0" />
			</div>
			<div className="flex items-center justify-between gap-2">
				<div className="text-xs text-muted-foreground">
					{item.profiles?.name ?? ""}
				</div>
				<div className="flex items-center gap-1 shrink-0">
					<div className="flex flex-col items-center mr-1 border-r pr-1 border-border">
						<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={onMoveUp} aria-label="위로 이동">
							<ChevronUp className="h-3 w-3" />
						</Button>
						<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={onMoveDown} aria-label="아래로 이동">
							<ChevronDown className="h-3 w-3" />
						</Button>
					</div>
					<div className="flex gap-1">
						<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={onPreview} title="미리보기">
							<Eye className="h-3.5 w-3.5" />
						</Button>
						{canEdit && (
							<>
								<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="수정">
									<Pencil className="h-3.5 w-3.5" />
								</Button>
								<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDelete} title="삭제">
									<Trash2 className="h-3.5 w-3.5" />
								</Button>
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

// ── VideoTable ─────────────────────────────────────────────────────────────────

export function VideoTable() {
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<VideoContent | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<VideoRow | null>(null);
	const [previewTarget, setPreviewTarget] = useState<VideoRow | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [searchText, setSearchText] = useState("");
	const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

	const { data: videoList = [], isLoading } = useQuery({
		queryKey: queryKeys.videos.all,
		queryFn: fetchVideos,
	});

	const isFiltering = searchText.trim() !== "" || activeFilter !== "all";

	const filteredList = videoList.filter((item) => {
		const q = searchText.toLowerCase().trim();
		const matchSearch = q === "" || item.title.toLowerCase().includes(q);
		const matchFilter = activeFilter === "all" || (activeFilter === "active" && item.is_active) || (activeFilter === "inactive" && !item.is_active);
		return matchSearch && matchFilter;
	});

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	const reorderMutation = useMutation({
		mutationFn: updateDisplayOrder,
		onError: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
			toast.error("순서 저장에 실패했습니다.");
		},
	});

	const toggleActiveMutation = useMutation({
		mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
			setTogglingId(id);
			return toggleActive(id, is_active);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.videos.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.videos.activeCount() });
		},
		onError: () => toast.error("상태 변경에 실패했습니다."),
		onSettled: () => setTogglingId(null),
	});

	function canEdit(item: VideoRow): boolean {
		if (!user) return false;
		if (user.role === "editor") return item.created_by === user.id;
		return true;
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = videoList.findIndex((item) => item.id === active.id);
		const newIndex = videoList.findIndex((item) => item.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(videoList, oldIndex, newIndex);
		queryClient.setQueryData<VideoRow[]>(queryKeys.videos.all, reordered);
		reorderMutation.mutate(reordered.map((item, index) => ({ id: item.id, display_order: index + 1 })));
	}

	function moveItem(index: number, direction: "up" | "down") {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= videoList.length) return;

		const reordered = arrayMove(videoList, index, newIndex);
		queryClient.setQueryData<VideoRow[]>(queryKeys.videos.all, reordered);
		reorderMutation.mutate(reordered.map((item, idx) => ({ id: item.id, display_order: idx + 1 })));
	}

	function handleEdit(item: VideoRow) {
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
				<PageHeader title="동영상 관리" description="사이니지에 표시할 동영상 콘텐츠를 관리합니다.">
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						동영상 등록
					</Button>
				</PageHeader>

				{isLoading ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : videoList.length === 0 ? (
					<EmptyState icon={Video} title="등록된 동영상이 없습니다" description="동영상 등록 버튼을 눌러 첫 번째 동영상을 등록하세요." action={{ label: "동영상 등록", onClick: handleCreate }} />
				) : (
					<>
						<div className="flex items-center justify-end gap-2">
							<div className="relative">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
								<Input
									placeholder="제목 검색..."
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
										const fullIndex = videoList.findIndex((n) => n.id === item.id);
										return (
											<MobileVideoCard
												key={item.id}
												item={item}
												canEdit={canEdit(item)}
												onPreview={() => setPreviewTarget(item)}
												onEdit={() => handleEdit(item)}
												onDelete={() => setDeleteTarget(item)}
												onToggleActive={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })}
												isTogglePending={togglingId === item.id}
												onMoveUp={() => moveItem(fullIndex, "up")}
												onMoveDown={() => moveItem(fullIndex, "down")}
												isFirst={fullIndex === 0}
												isLast={fullIndex === videoList.length - 1}
											/>
										);
									})}
								</div>

								{/* 태블릿/데스크탑 테이블 뷰 */}
								<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
									<div className="hidden sm:block rounded-lg border border-border overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead className="w-16 md:w-8 px-2" />
													<TableHead className="min-w-[200px]">제목</TableHead>
													<TableHead className="hidden sm:table-cell w-[200px]">파일명</TableHead>
													<TableHead className="w-[80px]">활성</TableHead>
													<TableHead className="hidden lg:table-cell w-[100px]">등록자</TableHead>
													<TableHead className="w-[80px]"></TableHead>
												</TableRow>
											</TableHeader>
											<SortableContext items={filteredList.map((item) => item.id)} strategy={verticalListSortingStrategy}>
												<TableBody>
													{filteredList.map((item) => {
														const fullIndex = videoList.findIndex((n) => n.id === item.id);
														return (
															<SortableTableRow
																key={item.id}
																item={item}
																canEdit={canEdit(item)}
																onPreview={() => setPreviewTarget(item)}
																onEdit={() => handleEdit(item)}
																onDelete={() => setDeleteTarget(item)}
																onToggleActive={(checked) => toggleActiveMutation.mutate({ id: item.id, is_active: checked })}
																isTogglePending={togglingId === item.id}
																isDragDisabled={isFiltering}
																onMoveUp={() => moveItem(fullIndex, "up")}
																onMoveDown={() => moveItem(fullIndex, "down")}
																isFirst={fullIndex === 0}
																isLast={fullIndex === videoList.length - 1}
															/>
														);
													})}
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

			<VideoFormDialog
				open={formOpen}
				onOpenChange={(v) => {
					setFormOpen(v);
					if (!v) setEditTarget(null);
				}}
				video={editTarget}
			/>

			{deleteTarget && (
				<DeleteVideoDialog
					open={!!deleteTarget}
					onOpenChange={(v) => {
						if (!v) setDeleteTarget(null);
					}}
					videoId={deleteTarget.id}
					title={deleteTarget.title}
					videoUrl={deleteTarget.video_url}
				/>
			)}

			<SignagePreviewModal
				open={!!previewTarget}
				onOpenChange={(v) => { if (!v) setPreviewTarget(null); }}
				title={previewTarget ? `동영상 미리보기 — ${previewTarget.title}` : "동영상 미리보기"}
				compact
			>
				{previewTarget && <VideoSlide video={previewTarget} />}
			</SignagePreviewModal>
		</>
	);
}
