"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { SignagePreviewModal } from "@/components/composite/signage-preview-modal";
import { OrgSlide } from "@/components/display/slides/OrgSlide";
import { Skeleton } from "@/components/ui/skeleton";
import type { Division, Team, Employee } from "@/types";

interface OrgPreviewModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	orgChartId: string;
	orgChartName?: string;
}

async function fetchDivisionsForPreview(orgChartId: string): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").eq("org_chart_id", orgChartId).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchTeamsForPreview(orgChartId: string): Promise<Team[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("teams").select("*").eq("org_chart_id", orgChartId).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchEmployeesForPreview(orgChartId: string): Promise<Employee[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("employees").select("*").eq("org_chart_id", orgChartId).eq("is_resigned", false).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

function OrgPreviewContent({ orgChartId }: { orgChartId: string }) {
	const divisionsQuery = useQuery({
		queryKey: queryKeys.divisions.byOrgChart(orgChartId),
		queryFn: () => fetchDivisionsForPreview(orgChartId),
		enabled: !!orgChartId,
	});

	const teamsQuery = useQuery({
		queryKey: queryKeys.teams.byOrgChart(orgChartId),
		queryFn: () => fetchTeamsForPreview(orgChartId),
		enabled: !!orgChartId,
	});

	const employeesQuery = useQuery({
		queryKey: queryKeys.employees.byOrgChart(orgChartId),
		queryFn: () => fetchEmployeesForPreview(orgChartId),
		enabled: !!orgChartId,
	});

	const isLoading = divisionsQuery.isLoading || teamsQuery.isLoading || employeesQuery.isLoading;

	if (isLoading) {
		return (
			<div className="w-full h-full flex items-center justify-center bg-[#0e1a2b]">
				<Skeleton className="w-3/4 h-1/2 bg-white/10" />
			</div>
		);
	}

	return (
		<OrgSlide
			divisions={divisionsQuery.data ?? []}
			teams={teamsQuery.data ?? []}
			employees={employeesQuery.data ?? []}
		/>
	);
}

export function OrgPreviewModal({ open, onOpenChange, orgChartId, orgChartName }: OrgPreviewModalProps) {
	return (
		<SignagePreviewModal
			open={open}
			onOpenChange={onOpenChange}
			title={orgChartName ? `미리보기 — ${orgChartName}` : "조직도 미리보기"}
		>
			{open && <OrgPreviewContent orgChartId={orgChartId} />}
		</SignagePreviewModal>
	);
}
