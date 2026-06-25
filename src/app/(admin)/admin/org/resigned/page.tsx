"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { toast } from "sonner";
import { PageHeader } from "@/components/composite/page-header";
import { ConfirmDialog } from "@/components/composite/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/composite/empty-state";
import { UserMinus, Undo2, Trash2 } from "lucide-react";
import type { Employee } from "@/types";

// ── Supabase ──────────────────────────────────────────────────────────────────

async function fetchResignedEmployees(): Promise<Employee[]> {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("employees")
		.select("*")
		.eq("is_resigned", true)
		.order("updated_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}

async function restoreEmployee(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("employees").update({ is_resigned: false }).eq("id", id);
	if (error) throw error;
}

async function deleteEmployee(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("employees").delete().eq("id", id);
	if (error) throw error;
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
	return name.slice(0, 2);
}

// ── 스켈레톤 ──────────────────────────────────────────────────────────────────

function ResignedListSkeleton() {
	return (
		<div className="flex flex-col gap-2">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-16 w-full rounded-lg" />
			))}
		</div>
	);
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────────────────

export default function ResignedPage() {
	const queryClient = useQueryClient();

	const { data: employees = [], isLoading } = useQuery({
		queryKey: queryKeys.employees.resigned(),
		queryFn: fetchResignedEmployees,
	});

	const restoreMutation = useMutation({
		mutationFn: (id: string) => restoreEmployee(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.resigned() });
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
			toast.success("퇴사 처리가 취소되었습니다.");
		},
		onError: () => toast.error("처리에 실패했습니다."),
	});

	const deleteMutation = useMutation({
		mutationFn: (id: string) => deleteEmployee(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.resigned() });
			toast.success("직원이 삭제되었습니다.");
		},
		onError: () => toast.error("삭제에 실패했습니다."),
	});

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="퇴사자 관리" description="퇴사 처리된 직원 목록을 관리합니다." />

			{isLoading ? (
				<ResignedListSkeleton />
			) : employees.length === 0 ? (
				<EmptyState icon={UserMinus} title="퇴사자가 없습니다" description="퇴사 처리된 직원이 없습니다." />
			) : (
				<div className="flex flex-col gap-2">
					{employees.map((employee) => (
						<div
							key={employee.id}
							className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
						>
							<Avatar className="h-10 w-10 shrink-0">
								<AvatarImage src={employee.profile_image_url ?? undefined} alt={employee.name} />
								<AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
							</Avatar>

							<div className="flex min-w-0 flex-1 flex-col">
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold">{employee.name}</span>
									{employee.position && (
										<span className="text-xs text-muted-foreground">{employee.position}</span>
									)}
									{employee.title && (
										<Badge className="border-0 bg-indigo-100 text-[10px] text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
											{employee.title}
										</Badge>
									)}
								</div>
								<span className="text-xs text-muted-foreground">
									입사일: {employee.hired_at?.slice(0, 10) ?? "-"}
								</span>
							</div>

							<div className="flex shrink-0 items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									className="h-8 gap-1 text-xs"
									onClick={() => restoreMutation.mutate(employee.id)}
									disabled={restoreMutation.isPending}
								>
									<Undo2 className="h-3 w-3" />
									퇴사 취소
								</Button>
								<ConfirmDialog
									trigger={
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-destructive hover:text-destructive"
											disabled={deleteMutation.isPending}
										>
											<Trash2 className="h-3.5 w-3.5" />
										</Button>
									}
									title={`${employee.name}을(를) 삭제하시겠습니까?`}
									description="삭제된 직원 데이터는 복구할 수 없습니다."
									confirmLabel="삭제"
									variant="destructive"
									onConfirm={() => deleteMutation.mutate(employee.id)}
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
