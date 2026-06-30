"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { toast } from "sonner";
import { useLogActivity } from "@/hooks/use-log-activity";
import { Plus, Radio, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/composite/confirm-dialog";
import { EmptyState } from "@/components/composite/empty-state";
import { PageHeader } from "@/components/composite/page-header";
import { OrgChartCreateDialog } from "./org-chart-create-dialog";
import type { OrgChart } from "@/types";

async function fetchOrgCharts(): Promise<OrgChart[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("org_charts").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function setActiveOrgChart(targetId: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.rpc("set_active_org_chart", { target_id: targetId });
	if (error) throw error;
}

async function deleteOrgChart(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("org_charts").delete().eq("id", id);
	if (error) throw error;
}

export function OrgChartList() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const log = useLogActivity();
	const [createOpen, setCreateOpen] = useState(false);

	const { data: orgCharts = [], isLoading } = useQuery({
		queryKey: queryKeys.orgCharts.all,
		queryFn: fetchOrgCharts,
	});

	const activateMutation = useMutation({
		mutationFn: setActiveOrgChart,
		onSuccess: (_, targetId) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.orgCharts.all });
			toast.success("표출 조직도가 변경되었습니다.");
			// 조직도 표출 전환 이력 기록
			const chartName = orgCharts.find((c) => c.id === targetId)?.name ?? targetId;
			log({ actionType: 'update', targetType: 'org_chart', targetId, targetName: chartName, description: `조직도 '${chartName}' 표출 버전으로 전환` });
		},
		onError: () => toast.error("표출 변경에 실패했습니다."),
	});

	const deleteMutation = useMutation({
		mutationFn: deleteOrgChart,
		onSuccess: (_, targetId) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.orgCharts.all });
			toast.success("조직도가 삭제되었습니다.");
			// 조직도 삭제 이력 기록
			const chartName = orgCharts.find((c) => c.id === targetId)?.name ?? targetId;
			log({ actionType: 'delete', targetType: 'org_chart', targetId, targetName: chartName, description: `조직도 '${chartName}' 삭제` });
		},
		onError: () => toast.error("조직도 삭제에 실패했습니다."),
	});

	if (isLoading) {
		return (
			<div className="flex flex-col gap-6">
				<Skeleton className="h-10 w-full" />
				{[...Array(3)].map((_, i) => (
					<Skeleton key={i} className="h-20 w-full rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="조직도 관리" description="버전별 조직도를 관리하고 사이니지 표출 버전을 선택합니다.">
				<Button size="sm" onClick={() => setCreateOpen(true)}>
					<Plus className="mr-1 h-3 w-3" />
					조직도 추가
				</Button>
			</PageHeader>

			{orgCharts.length === 0 ? (
				<EmptyState
					icon={Radio}
					title="등록된 조직도가 없습니다"
					description="조직도를 추가하여 사이니지 조직도를 구성해보세요."
				/>
			) : (
				<div className="flex flex-col gap-3">
					{orgCharts.map((chart) => {
						const isOnlyOne = orgCharts.length === 1;
						const isActive = chart.is_display_active || isOnlyOne;
						return (
						<div
							key={chart.id}
							className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 shadow-sm"
						>
							{/* 표출 라디오 */}
							<button
								type="button"
								className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
									isActive
										? "border-primary bg-primary"
										: "border-muted-foreground/40 hover:border-primary/60"
								}`}
								title={isActive ? "현재 표출 중" : "이 버전으로 표출 전환"}
								onClick={(e) => {
									e.stopPropagation();
									if (!isActive) {
										activateMutation.mutate(chart.id);
									}
								}}
								disabled={isActive || activateMutation.isPending}
							>
								{isActive && <div className="h-2 w-2 rounded-full bg-white" />}
							</button>

							{/* 이름 + 설명 */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-semibold truncate">{chart.name}</span>
									{isActive && (
										<Badge className="shrink-0 border-0 bg-primary/10 text-xs text-primary">표출 중</Badge>
									)}
								</div>
								{chart.description && (
									<p className="text-xs text-muted-foreground mt-0.5 truncate">{chart.description}</p>
								)}
							</div>

							{/* 편집/삭제 버튼 */}
							<div className="flex items-center gap-2 shrink-0">
								<Button
									variant="outline"
									size="sm"
									className="h-8 px-3 text-xs"
									onClick={() => router.push(`/admin/org/${chart.id}`)}
								>
									편집
								</Button>
								<ConfirmDialog
									trigger={
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-destructive hover:text-destructive"
											disabled={chart.is_display_active || orgCharts.length <= 1 || deleteMutation.isPending}
											title={
												orgCharts.length <= 1
													? "조직도가 1개뿐이라 삭제할 수 없습니다"
													: chart.is_display_active
													? "표출 중인 조직도는 삭제할 수 없습니다"
													: "삭제"
											}
											>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									}
									title={`"${chart.name}" 조직도를 삭제하시겠습니까?`}
									description="조직도와 하위 실/팀/직원 데이터가 모두 삭제되며 되돌릴 수 없습니다."
									confirmLabel="삭제"
									variant="destructive"
									onConfirm={() => deleteMutation.mutate(chart.id)}
								/>
							</div>
						</div>
					)
					})}
				</div>
			)}

			<OrgChartCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
