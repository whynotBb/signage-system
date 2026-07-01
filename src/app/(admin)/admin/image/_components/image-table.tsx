"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { ImageFormDialog } from "./image-form-dialog";
import { DeleteImageDialog } from "./delete-image-dialog";
import { PageHeader } from "@/components/composite/page-header";
import { EmptyState } from "@/components/composite/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GripVertical, Pencil, Trash2, Plus, ImageIcon, Search, ChevronUp, ChevronDown, Eye } from "lucide-react";
import { SignagePreviewModal } from "@/components/composite/signage-preview-modal";
import { ImageSlide } from "@/components/display/slides/ImageSlide";
import type { ImageContent } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type ImageRow = ImageContent & {
	profiles: { name: string } | null;
};

type ActiveFilter = "all" | "active" | "inactive";

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchImages(): Promise<ImageRow[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("image_contents").select("*, profiles(name)").order("display_order", { ascending: true }).order("created_at", { ascending: true });
	if (error) throw error;
	return (data ?? []) as ImageRow[];
}

async function updateDisplayOrder(items: { id: string; display_order: number }[]): Promise<void> {
	const supabase = createClient();
	await Promise.all(items.map(({ id, display_order }) => supabase.from("image_contents").update({ display_order }).eq("id", id)));
}

async function toggleActive(id: string, is_active: boolean): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("image_contents").update({ is_active }).eq("id", id);
	if (error) throw error;
}

// ── SortableTableRow ──────────────────────────────────────────────────────────

interface SortableRowProps {
	item: ImageRow;
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

			{/* 썸네일 */}
			<TableCell className="hidden sm:table-cell w-[80px] px-2">
				{item.image_url ? (
					<Image
						src={item.image_url}
						alt={item.title}
						width={64}
						height={40}
						className="h-10 w-16 rounded object-cover border border-border"
					/>
				) : (
					<div className="h-10 w-16 rounded bg-muted flex items-center justify-center">
						<ImageIcon className="h-4 w-4 text-muted-foreground" />
					</div>
				)}
			</TableCell>

			<TableCell>
				<span className="font-medium">{item.title}</span>
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

// ── MobileImageCard ────────────────────────────────────────────────────────────

interface MobileImageCardProps {
	item: ImageRow;
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

function MobileImageCard({ item, canEdit, onPreview, onEdit, onDelete, onToggleActive, isTogglePending, onMoveUp, onMoveDown, isFirst, isLast }: MobileImageCardProps) {
	return (
		<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
			<div className="flex items-start justify-between gap-3">
				<div className="flex items-center gap-3 flex-1 min-w-0">
					{item.image_url ? (
						<Image src={item.image_url} alt={item.title} width={64} height={40} className="h-10 w-16 rounded object-cover border border-border shrink-0" />
					) : (
						<div className="h-10 w-16 rounded bg-muted flex items-center justify-center shrink-0">
							<ImageIcon className="h-4 w-4 text-muted-foreground" />
						</div>
					)}
					<p className="font-medium text-sm leading-snug truncate">{item.title}</p>
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

// ── ImageTable ─────────────────────────────────────────────────────────────────

export function ImageTable() {
	const queryClient = useQueryClient();
	const { user } = useAuthStore();

	const [formOpen, setFormOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ImageContent | null>(null);
	const [deleteTarget, setDeleteTarget] = useState<ImageRow | null>(null);
	const [previewTarget, setPreviewTarget] = useState<ImageRow | null>(null);
	const [togglingId, setTogglingId] = useState<string | null>(null);
	const [searchText, setSearchText] = useState("");
	const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

	const { data: imageList = [], isLoading } = useQuery({
		queryKey: queryKeys.images.all,
		queryFn: fetchImages,
	});

	const isFiltering = searchText.trim() !== "" || activeFilter !== "all";

	const filteredList = imageList.filter((item) => {
		const q = searchText.toLowerCase().trim();
		const matchSearch = q === "" || item.title.toLowerCase().includes(q);
		const matchFilter = activeFilter === "all" || (activeFilter === "active" && item.is_active) || (activeFilter === "inactive" && !item.is_active);
		return matchSearch && matchFilter;
	});

	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	const reorderMutation = useMutation({
		mutationFn: updateDisplayOrder,
		onError: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
			toast.error("순서 저장에 실패했습니다.");
		},
	});

	const toggleActiveMutation = useMutation({
		mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
			setTogglingId(id);
			return toggleActive(id, is_active);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.images.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.images.activeCount() });
		},
		onError: () => toast.error("상태 변경에 실패했습니다."),
		onSettled: () => setTogglingId(null),
	});

	function canEdit(item: ImageRow): boolean {
		if (!user) return false;
		if (user.role === "editor") return item.created_by === user.id;
		return true;
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = imageList.findIndex((item) => item.id === active.id);
		const newIndex = imageList.findIndex((item) => item.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(imageList, oldIndex, newIndex);
		queryClient.setQueryData<ImageRow[]>(queryKeys.images.all, reordered);
		reorderMutation.mutate(reordered.map((item, index) => ({ id: item.id, display_order: index + 1 })));
	}

	function moveItem(index: number, direction: "up" | "down") {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= imageList.length) return;

		const reordered = arrayMove(imageList, index, newIndex);
		queryClient.setQueryData<ImageRow[]>(queryKeys.images.all, reordered);
		reorderMutation.mutate(reordered.map((item, idx) => ({ id: item.id, display_order: idx + 1 })));
	}

	function handleEdit(item: ImageRow) {
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
				<PageHeader title="이미지 관리" description="사이니지에 표시할 이미지 콘텐츠를 관리합니다.">
					<Button onClick={handleCreate}>
						<Plus className="mr-2 h-4 w-4" />
						이미지 등록
					</Button>
				</PageHeader>

				{isLoading ? (
					<div className="flex flex-col gap-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} className="h-12 w-full" />
						))}
					</div>
				) : imageList.length === 0 ? (
					<EmptyState icon={ImageIcon} title="등록된 이미지가 없습니다" description="이미지 등록 버튼을 눌러 첫 번째 이미지를 등록하세요." action={{ label: "이미지 등록", onClick: handleCreate }} />
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
										const fullIndex = imageList.findIndex((n) => n.id === item.id);
										return (
											<MobileImageCard
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
												isLast={fullIndex === imageList.length - 1}
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
													<TableHead className="hidden sm:table-cell w-[80px] px-2">썸네일</TableHead>
													<TableHead className="min-w-[200px]">제목</TableHead>
													<TableHead className="w-[80px]">활성</TableHead>
													<TableHead className="hidden lg:table-cell w-[100px]">등록자</TableHead>
													<TableHead className="w-[80px]"></TableHead>
												</TableRow>
											</TableHeader>
											<SortableContext items={filteredList.map((item) => item.id)} strategy={verticalListSortingStrategy}>
												<TableBody>
													{filteredList.map((item) => {
														const fullIndex = imageList.findIndex((n) => n.id === item.id);
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
																isLast={fullIndex === imageList.length - 1}
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

			<ImageFormDialog
				open={formOpen}
				onOpenChange={(v) => {
					setFormOpen(v);
					if (!v) setEditTarget(null);
				}}
				image={editTarget}
			/>

			{deleteTarget && (
				<DeleteImageDialog
					open={!!deleteTarget}
					onOpenChange={(v) => {
						if (!v) setDeleteTarget(null);
					}}
					imageId={deleteTarget.id}
					title={deleteTarget.title}
					imageUrl={deleteTarget.image_url}
				/>
			)}

			<SignagePreviewModal
				open={!!previewTarget}
				onOpenChange={(v) => { if (!v) setPreviewTarget(null); }}
				title={previewTarget ? `이미지 미리보기 — ${previewTarget.title}` : "이미지 미리보기"}
				compact
			>
				{previewTarget && <ImageSlide image={previewTarget} />}
			</SignagePreviewModal>
		</>
	);
}
