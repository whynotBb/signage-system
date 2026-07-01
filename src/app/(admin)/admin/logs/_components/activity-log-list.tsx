"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/composite/page-header";
import { EmptyState } from "@/components/composite/empty-state";
import { History, ChevronLeft, ChevronRight } from "lucide-react";
import type { ActivityLog } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PAGE_SIZE = 30;

const ACTION_TYPE_LABEL: Record<string, string> = {
	create: "등록",
	update: "수정",
	delete: "삭제",
};

const TARGET_TYPE_LABEL: Record<string, string> = {
	employee: "직원",
	division: "실(Division)",
	team: "팀(Team)",
	news: "뉴스",
	visitor: "방문자",
	video: "동영상",
	image: "이미지",
	company_intro: "회사소개",
	org_chart: "조직도",
	user: "사용자",
};

type ActionFilter = "all" | "create" | "update" | "delete";
type TargetFilter = "all" | string;

interface Filters {
	actionType: ActionFilter;
	targetType: TargetFilter;
}

async function fetchActivityLogs(filters: Filters, page: number): Promise<{ data: ActivityLog[]; count: number }> {
	const supabase = createClient();
	let query = supabase
		.from("activity_logs")
		.select("*", { count: "exact" })
		.order("created_at", { ascending: false })
		.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

	if (filters.actionType !== "all") {
		query = query.eq("action_type", filters.actionType);
	}
	if (filters.targetType !== "all") {
		query = query.eq("target_type", filters.targetType);
	}

	const { data, error, count } = await query;
	if (error) throw error;
	return { data: data ?? [], count: count ?? 0 };
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("ko-KR", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function ActionBadge({ type }: { type: string }) {
	const variants: Record<string, string> = {
		create: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
		update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
		delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
	};
	return <Badge className={`border-0 text-xs font-medium ${variants[type] ?? "bg-muted text-muted-foreground"}`}>{ACTION_TYPE_LABEL[type] ?? type}</Badge>;
}

// ── 모바일 카드 ────────────────────────────────────────────────────────────────

function MobileActivityLogCard({ log }: { log: ActivityLog }) {
	return (
		<div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-2">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground tabular-nums">{formatDate(log.created_at)}</span>
				<ActionBadge type={log.action_type} />
			</div>
			<p className="text-sm leading-snug">{log.description}</p>
			<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
				<span className="font-medium text-foreground">{log.actor_name}</span>
				<span>·</span>
				<span>{TARGET_TYPE_LABEL[log.target_type] ?? log.target_type}</span>
			</div>
		</div>
	);
}

export function ActivityLogList() {
	const [page, setPage] = useState(0);
	const [filters, setFilters] = useState<Filters>({ actionType: "all", targetType: "all" });

	const { data, isLoading } = useQuery({
		queryKey: queryKeys.activityLogs.list({ ...filters, page }),
		queryFn: () => fetchActivityLogs(filters, page),
	});

	const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

	function handleFilterChange(key: keyof Filters, value: string) {
		setFilters((prev) => ({ ...prev, [key]: value }));
		setPage(0);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="변경 이력" description="콘텐츠 등록·수정·삭제 이력을 조회합니다." />

			{/* 필터 */}
			<div className="flex flex-wrap gap-2">
				<Select value={filters.actionType} onValueChange={(v) => handleFilterChange("actionType", v)}>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="작업 유형" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">전체 작업</SelectItem>
						<SelectItem value="create">등록</SelectItem>
						<SelectItem value="update">수정</SelectItem>
						<SelectItem value="delete">삭제</SelectItem>
					</SelectContent>
				</Select>

				<Select value={filters.targetType} onValueChange={(v) => handleFilterChange("targetType", v)}>
					<SelectTrigger className="w-36">
						<SelectValue placeholder="대상 유형" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">전체 대상</SelectItem>
						{Object.entries(TARGET_TYPE_LABEL).map(([k, v]) => (
							<SelectItem key={k} value={k}>
								{v}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* 목록 */}
			{isLoading ? (
				<div className="flex flex-col gap-2">
					{[...Array(8)].map((_, i) => (
						<Skeleton key={i} className="h-12 w-full rounded-lg" />
					))}
				</div>
			) : !data?.data.length ? (
				<EmptyState icon={History} title="변경 이력이 없습니다" description="콘텐츠 등록·수정·삭제 시 이력이 기록됩니다." />
			) : (
				<>
					{/* 모바일 카드 뷰 */}
					<div className="sm:hidden flex flex-col gap-2">
						{data.data.map((log) => (
							<MobileActivityLogCard key={log.id} log={log} />
						))}
					</div>

					{/* 태블릿/데스크탑 테이블 뷰 */}
					<div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="hidden md:table-cell w-px whitespace-nowrap">일시</TableHead>
									<TableHead className="whitespace-nowrap">작업자</TableHead>
									<TableHead className="whitespace-nowrap">작업</TableHead>
									<TableHead className="hidden lg:table-cell whitespace-nowrap">대상</TableHead>
									<TableHead>내용</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.data.map((log) => (
									<TableRow key={log.id}>
										<TableCell className="hidden md:table-cell whitespace-nowrap text-muted-foreground tabular-nums">{formatDate(log.created_at)}</TableCell>
										<TableCell className="whitespace-nowrap font-medium">{log.actor_name}</TableCell>
										<TableCell className="whitespace-nowrap">
											<ActionBadge type={log.action_type} />
										</TableCell>
										<TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">{TARGET_TYPE_LABEL[log.target_type] ?? log.target_type}</TableCell>
										<TableCell>{log.description}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{/* 페이지네이션 */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between text-sm text-muted-foreground">
							<span>
								{data.count}건 중 {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.count)}건
							</span>
							<div className="flex items-center gap-1">
								<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="px-2 tabular-nums">
									{page + 1} / {totalPages}
								</span>
								<Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
