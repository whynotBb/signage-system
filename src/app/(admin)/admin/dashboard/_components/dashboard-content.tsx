"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	DndContext,
	PointerSensor,
	KeyboardSensor,
	useSensor,
	useSensors,
	closestCenter,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
	arrayMove,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { toast } from "sonner";
import { PageHeader } from "@/components/composite/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, ChevronDown, ChevronUp, ExternalLink, Users, Newspaper, UserCheck, Building2, Video, Image, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { OrgChart } from "@/types";

// ── 타입 ─────────────────────────────────────────────────────────────────────

type GroupKey = "org" | "news" | "visitor" | "company_intro" | "video" | "image";

type ContentItem = {
	id: string;
	title: string;
	subtitle?: string | null;
	extra?: string | null;
	is_active: boolean;
	display_order: number;
};

type SlideGroup = {
	key: GroupKey;
	display_order: number;
	items: ContentItem[];
	safeinsight_enabled?: boolean;
	inguide_enabled?: boolean;
};

// ── 그룹 메타 ─────────────────────────────────────────────────────────────────

const GROUP_META: Record<GroupKey, { label: string; href: string; icon: LucideIcon }> = {
	org: { label: "조직도", href: "/admin/org", icon: Users },
	news: { label: "뉴스", href: "/admin/news", icon: Newspaper },
	visitor: { label: "방문자", href: "/admin/visitor", icon: UserCheck },
	company_intro: { label: "회사소개", href: "/admin/company-intro", icon: Building2 },
	video: { label: "동영상", href: "/admin/video", icon: Video },
	image: { label: "이미지", href: "/admin/image", icon: Image },
};

type ContentTable = "news_contents" | "visitor_contents" | "video_contents" | "image_contents";

const GROUP_TABLE: Partial<Record<GroupKey, ContentTable>> = {
	news: "news_contents",
	visitor: "visitor_contents",
	video: "video_contents",
	image: "image_contents",
};

const GROUP_QUERY_KEY: Partial<Record<GroupKey, readonly unknown[]>> = {
	news: queryKeys.news.all,
	visitor: queryKeys.visitors.all,
	video: queryKeys.videos.all,
	image: queryKeys.images.all,
};

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function fetchGroupOrder(): Promise<{ group_key: string; display_order: number }[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("signage_group_order").select("group_key, display_order").order("display_order");
	if (error) throw error;
	return data ?? [];
}

async function fetchAllNews(): Promise<ContentItem[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("news_contents").select("id, title, subtitle, is_active, display_order").order("display_order").order("created_at");
	if (error) throw error;
	return (data ?? []) as ContentItem[];
}

async function fetchAllVisitors(): Promise<ContentItem[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("visitor_contents").select("id, title, visitor_org, is_active, display_order").order("display_order").order("created_at", { ascending: false });
	if (error) throw error;
	return (data ?? []).map((r) => ({
		id: r.id,
		title: r.title,
		extra: (r as Record<string, unknown>)["visitor_org"] as string | null,
		is_active: r.is_active,
		display_order: r.display_order,
	}));
}

async function fetchAllVideos(): Promise<ContentItem[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("video_contents").select("id, title, is_active, display_order").order("display_order").order("created_at");
	if (error) throw error;
	return (data ?? []).map((r) => ({ ...r, display_order: (r as Record<string, unknown>)["display_order"] as number ?? 0 })) as ContentItem[];
}

async function fetchAllImages(): Promise<ContentItem[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("image_contents").select("id, title, is_active, display_order").order("display_order").order("created_at");
	if (error) throw error;
	return (data ?? []).map((r) => ({ ...r, display_order: (r as Record<string, unknown>)["display_order"] as number ?? 0 })) as ContentItem[];
}

async function fetchCompanyIntroConfig(): Promise<{ id: string; safeinsight_enabled: boolean; inguide_enabled: boolean }> {
	const supabase = createClient();
	const { data, error } = await supabase.from("company_intro_config").select("id, safeinsight_enabled, inguide_enabled").single();
	if (error) throw error;
	return data as { id: string; safeinsight_enabled: boolean; inguide_enabled: boolean };
}

async function fetchOrgCharts(): Promise<Pick<OrgChart, 'id' | 'name' | 'is_display_active'>[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("org_charts").select("id, name, is_display_active").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchActiveEmployeeCount(orgChartId: string | null): Promise<number> {
	if (!orgChartId) return 0;
	const supabase = createClient();
	const { count, error } = await supabase.from("employees").select("id", { count: "exact", head: true }).eq("org_chart_id", orgChartId).eq("is_resigned", false);
	if (error) throw error;
	return count ?? 0;
}

async function updateGroupOrder(items: { group_key: string; display_order: number }[]) {
	const supabase = createClient();
	await Promise.all(items.map(({ group_key, display_order }) => supabase.from("signage_group_order").update({ display_order }).eq("group_key", group_key)));
}

async function updateItemOrder(table: ContentTable, items: { id: string; display_order: number }[]) {
	const supabase = createClient();
	await Promise.all(items.map(({ id, display_order }) => supabase.from(table).update({ display_order }).eq("id", id)));
}

async function toggleItemActive(table: ContentTable, id: string, is_active: boolean) {
	const supabase = createClient();
	const { error } = await supabase.from(table).update({ is_active }).eq("id", id);
	if (error) throw error;
}

async function toggleSafeInsight(id: string, safeinsight_enabled: boolean) {
	const supabase = createClient();
	const { error } = await supabase.from("company_intro_config").update({ safeinsight_enabled }).eq("id", id);
	if (error) throw error;
}

async function toggleInGuide(id: string, inguide_enabled: boolean) {
	const supabase = createClient();
	const { error } = await supabase.from("company_intro_config").update({ inguide_enabled }).eq("id", id);
	if (error) throw error;
}

// ── SortableItemRow ───────────────────────────────────────────────────────────

interface SortableItemRowProps {
	item: ContentItem;
	isDragDisabled: boolean;
	isFirst: boolean;
	isLast: boolean;
	onToggle: (is_active: boolean) => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
}

function SortableItemRow({ item, isDragDisabled, isFirst, isLast, onToggle, onMoveUp, onMoveDown }: SortableItemRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
		zIndex: isDragging ? 1 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style} className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors">
			{/* 아이템 드래그 핸들 */}
			{isDragDisabled ? (
				<span className="block w-4 h-4 shrink-0" />
			) : (
				<button {...attributes} {...listeners} className="cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0" aria-label="순서 변경">
					<GripVertical className="h-4 w-4" />
				</button>
			)}

			{/* 콘텐츠 정보 */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{item.title}</p>
				{(item.subtitle || item.extra) && <p className="text-xs text-muted-foreground truncate">{item.subtitle ?? item.extra}</p>}
			</div>

			{/* 위아래 이동 버튼 — 모바일 전용 */}
			<div className="sm:hidden flex flex-col shrink-0">
				<Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={isFirst || isDragDisabled} aria-label="위로 이동">
					<ChevronUp className="h-3 w-3" />
				</Button>
				<Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={isLast || isDragDisabled} aria-label="아래로 이동">
					<ChevronDown className="h-3 w-3" />
				</Button>
			</div>

			{/* 활성 토글 */}
			<Switch checked={item.is_active} onCheckedChange={onToggle} aria-label={item.is_active ? "활성" : "비활성"} className="shrink-0" />
		</div>
	);
}

// ── SortableGroupCard ─────────────────────────────────────────────────────────

interface SortableGroupCardProps {
	group: SlideGroup;
	isDragDisabled: boolean;
	showActiveOnly: boolean;
	activeEmployeeCount?: number;
	orgCharts?: Pick<OrgChart, 'id' | 'name' | 'is_display_active'>[];
	onItemToggle: (itemId: string, is_active: boolean) => void;
	onItemReorder: (newItems: ContentItem[]) => void;
	onSafeInsightToggle?: (v: boolean) => void;
	onInGuideToggle?: (v: boolean) => void;
	onMoveUp?: () => void;
	onMoveDown?: () => void;
	isFirst?: boolean;
	isLast?: boolean;
}

function SortableGroupCard({ group, isDragDisabled, showActiveOnly, activeEmployeeCount, orgCharts = [], onItemToggle, onItemReorder, onSafeInsightToggle, onInGuideToggle, onMoveUp, onMoveDown, isFirst, isLast }: SortableGroupCardProps) {
	const [collapsed, setCollapsed] = useState(false);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.key });

	const style: React.CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
		zIndex: isDragging ? 10 : undefined,
	};

	const itemSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	const meta = GROUP_META[group.key];
	const Icon = meta.icon;
	const isOrg = group.key === "org";
	const isCompanyIntro = group.key === "company_intro";
	const hasItems = !isOrg && !isCompanyIntro;

	const displayItems = showActiveOnly ? group.items.filter((i) => i.is_active) : group.items;
	const activeCount = group.items.filter((i) => i.is_active).length;
	const totalCount = group.items.length;

	function handleItemDragEnd(event: DragEndEvent) {
		if (isDragDisabled) return;
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = group.items.findIndex((i) => i.id === active.id);
		const newIndex = group.items.findIndex((i) => i.id === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		onItemReorder(arrayMove(group.items, oldIndex, newIndex));
	}

	function handleMoveUp(item: ContentItem) {
		const idx = group.items.indexOf(item);
		if (idx <= 0) return;
		onItemReorder(arrayMove(group.items, idx, idx - 1));
	}

	function handleMoveDown(item: ContentItem) {
		const idx = group.items.indexOf(item);
		if (idx >= group.items.length - 1) return;
		onItemReorder(arrayMove(group.items, idx, idx + 1));
	}

	return (
		<div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card overflow-hidden shadow-sm">
			{/* 그룹 헤더 */}
			<div className="flex items-center gap-3 px-4 py-3 bg-muted/30">
				{/* 그룹 드래그 핸들 및 모바일 이동 화살표 */}
				{isDragDisabled ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="block w-5 h-5 shrink-0 text-muted-foreground/30 cursor-not-allowed">
								<GripVertical className="h-5 w-5" />
							</span>
						</TooltipTrigger>
						<TooltipContent side="right">순서 변경은 전체 보기 상태에서만 가능합니다</TooltipContent>
					</Tooltip>
				) : (
					<div className="flex items-center gap-1 shrink-0">
						{/* 데스크톱: DND 그립 */}
						<button {...attributes} {...listeners} className="hidden md:inline-flex cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground transition-colors shrink-0" aria-label="그룹 순서 변경">
							<GripVertical className="h-5 w-5" />
						</button>
						{/* 모바일: 화살표 순서 변경 */}
						<div className="flex md:hidden flex-col items-center">
							<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isFirst} onClick={onMoveUp} aria-label="위로 이동" title="위로 이동">
								<ChevronUp className="h-3 w-3" />
							</Button>
							<Button variant="ghost" size="icon" className="h-5 w-5" disabled={isLast} onClick={onMoveDown} aria-label="아래로 이동" title="아래로 이동">
								<ChevronDown className="h-3 w-3" />
							</Button>
						</div>
					</div>
				)}

				<Icon className="h-4 w-4 text-muted-foreground shrink-0" />
				<span className="font-semibold text-sm">{meta.label}</span>

				{/* 배지 */}
				{isOrg && (
					<Badge variant="outline" className="text-xs ml-1">
						재직 {activeEmployeeCount ?? 0}명
					</Badge>
				)}
				{isCompanyIntro && (() => {
					const activeCount = (group.safeinsight_enabled ? 1 : 0) + (group.inguide_enabled ? 1 : 0);
					return (
						<Badge variant="outline" className={cn("text-xs ml-1", activeCount > 0 ? "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400" : "")}>
							활성 {activeCount}/2
						</Badge>
					);
				})()}
				{hasItems && (
					<Badge variant="outline" className="text-xs ml-1">
						활성 {activeCount}/{totalCount}
					</Badge>
				)}

				<div className="ml-auto flex items-center gap-1">
					{/* 관리 페이지 링크 */}
					<Button variant="ghost" size="icon" className="h-7 w-7" asChild>
						<Link href={meta.href} aria-label={`${meta.label} 관리`}>
							<ExternalLink className="h-3.5 w-3.5" />
						</Link>
					</Button>

					{/* 접기/펼치기 */}
					{(hasItems || isOrg || isCompanyIntro) && (
						<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "펼치기" : "접기"}>
							<ChevronDown className={cn("h-4 w-4 transition-transform duration-200", collapsed && "-rotate-90")} />
						</Button>
					)}
				</div>
			</div>

			{/* 그룹 내용 */}
			{!collapsed && (
				<>
					{isOrg && (
						<div className="divide-y divide-border/50">
							{orgCharts.length === 0 ? (
								<div className="px-4 py-3 text-sm text-muted-foreground">등록된 조직도가 없습니다.</div>
							) : (
								orgCharts.map((chart) => (
									<div key={chart.id} className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/20 transition-colors">
										<div className="flex-1 min-w-0 flex items-center gap-2">
											<span className="text-sm font-medium truncate">{chart.name}</span>
											{chart.is_display_active && (
												<Badge className="text-xs border-0 bg-primary/10 text-primary font-normal shrink-0">표출 중</Badge>
											)}
										</div>
										<Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild>
											<Link href={`/admin/org/${chart.id}`} aria-label={`${chart.name} 편집`}>
												<Pencil className="h-3.5 w-3.5" />
											</Link>
										</Button>
									</div>
								))
							)}
						</div>
					)}

					{isCompanyIntro && (
						<div className="divide-y divide-border/50">
							<div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium">SafeInsight</p>
									<p className="text-xs text-muted-foreground">안전보건 정보 슬라이드</p>
								</div>
								<Switch
									checked={group.safeinsight_enabled ?? false}
									onCheckedChange={onSafeInsightToggle}
									aria-label="SafeInsight 슬라이드 활성화"
									className="shrink-0"
								/>
							</div>
							<div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium">In-Guide</p>
									<p className="text-xs text-muted-foreground">사내 가이드 슬라이드</p>
								</div>
								<Switch
									checked={group.inguide_enabled ?? false}
									onCheckedChange={onInGuideToggle}
									aria-label="In-Guide 슬라이드 활성화"
									className="shrink-0"
								/>
							</div>
						</div>
					)}

					{hasItems && (
						<>
							{displayItems.length === 0 ? (
								<div className="px-4 py-6 text-center text-sm text-muted-foreground">{showActiveOnly ? "활성 콘텐츠가 없습니다." : "등록된 콘텐츠가 없습니다."}</div>
							) : (
								<DndContext sensors={itemSensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
									<SortableContext items={displayItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
										{displayItems.map((item, idx) => (
											<SortableItemRow
												key={item.id}
												item={item}
												isDragDisabled={isDragDisabled}
												isFirst={idx === 0}
												isLast={idx === displayItems.length - 1}
												onToggle={(v) => onItemToggle(item.id, v)}
												onMoveUp={() => handleMoveUp(item)}
												onMoveDown={() => handleMoveDown(item)}
											/>
										))}
									</SortableContext>
								</DndContext>
							)}
						</>
					)}
				</>
			)}
		</div>
	);
}

// ── DashboardContent ──────────────────────────────────────────────────────────

export function DashboardContent() {
	const queryClient = useQueryClient();
	const [showActiveOnly, setShowActiveOnly] = useState(false);

	const { data: groupOrderData = [], isLoading: isLoadingGroups } = useQuery({ queryKey: queryKeys.signageGroupOrder.all, queryFn: fetchGroupOrder });
	const { data: newsItems = [], isLoading: isLoadingNews } = useQuery({ queryKey: queryKeys.news.all, queryFn: fetchAllNews });
	const { data: visitorItems = [], isLoading: isLoadingVisitors } = useQuery({ queryKey: queryKeys.visitors.all, queryFn: fetchAllVisitors });
	const { data: videoItems = [], isLoading: isLoadingVideos } = useQuery({ queryKey: queryKeys.videos.all, queryFn: fetchAllVideos });
	const { data: imageItems = [], isLoading: isLoadingImages } = useQuery({ queryKey: queryKeys.images.all, queryFn: fetchAllImages });
	const { data: companyIntroConfig } = useQuery({ queryKey: queryKeys.companyIntro.config(), queryFn: fetchCompanyIntroConfig });
	const { data: orgCharts = [] } = useQuery({ queryKey: queryKeys.orgCharts.all, queryFn: fetchOrgCharts });

	const activeOrgChartId = orgCharts.find((c) => c.is_display_active)?.id ?? null;

	const { data: activeEmployeeCount = 0 } = useQuery({
		queryKey: queryKeys.employees.activeCount(activeOrgChartId),
		queryFn: () => fetchActiveEmployeeCount(activeOrgChartId),
	});

	const isLoading = isLoadingGroups || isLoadingNews || isLoadingVisitors || isLoadingVideos || isLoadingImages;

	const ITEM_MAP: Record<GroupKey, ContentItem[]> = {
		org: [],
		news: newsItems,
		visitor: visitorItems,
		company_intro: [],
		video: videoItems,
		image: imageItems,
	};

	const groups: SlideGroup[] = groupOrderData
		.map((g) => ({
			key: g.group_key as GroupKey,
			display_order: g.display_order,
			items: ITEM_MAP[g.group_key as GroupKey] ?? [],
			safeinsight_enabled: g.group_key === "company_intro" ? (companyIntroConfig?.safeinsight_enabled ?? false) : undefined,
			inguide_enabled: g.group_key === "company_intro" ? (companyIntroConfig?.inguide_enabled ?? false) : undefined,
		}))
		.sort((a, b) => a.display_order - b.display_order);

	const visibleGroups = showActiveOnly
		? groups.filter((g) => {
				if (g.key === "org") return true;
				if (g.key === "company_intro") return g.safeinsight_enabled || g.inguide_enabled;
				return g.items.some((i) => i.is_active);
		  })
		: groups;

	const totalActiveSlides =
		(activeEmployeeCount > 0 ? 1 : 0) +
		newsItems.filter((i) => i.is_active).length +
		visitorItems.filter((i) => i.is_active).length +
		(companyIntroConfig?.safeinsight_enabled ? 1 : 0) +
		(companyIntroConfig?.inguide_enabled ? 1 : 0) +
		videoItems.filter((i) => i.is_active).length +
		imageItems.filter((i) => i.is_active).length;

	const groupSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

	// ── 그룹 순서 변경 ──

	function handleGroupDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const oldIndex = groups.findIndex((g) => g.key === active.id);
		const newIndex = groups.findIndex((g) => g.key === over.id);
		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(groups, oldIndex, newIndex);
		const updates = reordered.map((g, i) => ({ group_key: g.key, display_order: i + 1 }));

		queryClient.setQueryData(queryKeys.signageGroupOrder.all, updates);
		updateGroupOrder(updates).catch(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.signageGroupOrder.all });
			toast.error("그룹 순서 저장에 실패했습니다.");
		});
	}

	function moveGroup(index: number, direction: "up" | "down") {
		const newIndex = direction === "up" ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= groups.length) return;

		const reordered = arrayMove(groups, index, newIndex);
		const updates = reordered.map((g, i) => ({ group_key: g.key, display_order: i + 1 }));

		queryClient.setQueryData(queryKeys.signageGroupOrder.all, updates);
		updateGroupOrder(updates).catch(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.signageGroupOrder.all });
			toast.error("그룹 순서 저장에 실패했습니다.");
		});
	}

	// ── 아이템 순서 변경 ──

	function handleItemReorder(groupKey: GroupKey, newItems: ContentItem[]) {
		const table = GROUP_TABLE[groupKey];
		const qk = GROUP_QUERY_KEY[groupKey];
		if (!table || !qk) return;

		const prev = queryClient.getQueryData<ContentItem[]>(qk);
		queryClient.setQueryData(qk, newItems);

		updateItemOrder(table, newItems.map((item, idx) => ({ id: item.id, display_order: idx + 1 }))).catch(() => {
			if (prev) queryClient.setQueryData(qk, prev);
			toast.error("순서 저장에 실패했습니다.");
		});
	}

	// ── 아이템 활성 토글 ──

	function handleItemToggle(groupKey: GroupKey, itemId: string, is_active: boolean) {
		const table = GROUP_TABLE[groupKey];
		const qk = GROUP_QUERY_KEY[groupKey];
		if (!table || !qk) return;

		queryClient.setQueryData<ContentItem[]>(qk, (prev) => (prev ?? []).map((i) => (i.id === itemId ? { ...i, is_active } : i)));

		toggleItemActive(table, itemId, is_active).catch(() => {
			queryClient.invalidateQueries({ queryKey: qk });
			toast.error("상태 변경에 실패했습니다.");
		});
	}

	// ── 회사소개 개별 토글 ──

	function handleSafeInsightToggle(safeinsight_enabled: boolean) {
		if (!companyIntroConfig) return;
		queryClient.setQueryData(queryKeys.companyIntro.config(), { ...companyIntroConfig, safeinsight_enabled });
		toggleSafeInsight(companyIntroConfig.id, safeinsight_enabled).catch(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.companyIntro.config() });
			toast.error("상태 변경에 실패했습니다.");
		});
	}

	function handleInGuideToggle(inguide_enabled: boolean) {
		if (!companyIntroConfig) return;
		queryClient.setQueryData(queryKeys.companyIntro.config(), { ...companyIntroConfig, inguide_enabled });
		toggleInGuide(companyIntroConfig.id, inguide_enabled).catch(() => {
			queryClient.invalidateQueries({ queryKey: queryKeys.companyIntro.config() });
			toast.error("상태 변경에 실패했습니다.");
		});
	}

	// ── 로딩 ──

	if (isLoading) {
		return (
			<div className="flex flex-col gap-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-14 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (groupOrderData.length === 0) {
		return (
			<div className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
				DB 마이그레이션이 필요합니다. Supabase SQL Editor에서{" "}
				<code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">signage_group_order</code> 테이블 생성 후 새로고침 해주세요.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="대시보드" description={`현재 ${totalActiveSlides}개 슬라이드가 표출 중입니다.`}>
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground whitespace-nowrap">활성 콘텐츠만 보기</span>
					<Switch checked={showActiveOnly} onCheckedChange={setShowActiveOnly} aria-label="활성 콘텐츠만 보기" />
				</div>
			</PageHeader>

			<DndContext sensors={groupSensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
				<SortableContext items={groups.map((g) => g.key)} strategy={verticalListSortingStrategy}>
					<div className="flex flex-col gap-3">
						{visibleGroups.map((group) => {
							const fullIndex = groups.findIndex((g) => g.key === group.key);
							return (
								<SortableGroupCard
									key={group.key}
									group={group}
									isDragDisabled={showActiveOnly}
									showActiveOnly={showActiveOnly}
									activeEmployeeCount={group.key === "org" ? activeEmployeeCount : undefined}
									orgCharts={group.key === "org" ? orgCharts : undefined}
									onItemToggle={(itemId, v) => handleItemToggle(group.key, itemId, v)}
									onItemReorder={(newItems) => handleItemReorder(group.key, newItems)}
									onSafeInsightToggle={group.key === "company_intro" ? handleSafeInsightToggle : undefined}
									onInGuideToggle={group.key === "company_intro" ? handleInGuideToggle : undefined}
									onMoveUp={() => moveGroup(fullIndex, "up")}
									onMoveDown={() => moveGroup(fullIndex, "down")}
									isFirst={fullIndex === 0}
									isLast={fullIndex === groups.length - 1}
								/>
							);
						})}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
