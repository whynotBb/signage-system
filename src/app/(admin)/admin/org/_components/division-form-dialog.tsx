"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { divisionSchema, type DivisionFormValues } from "@/lib/validations/org";
import { generateShuffleColor } from "@/lib/color-utils";
import { toast } from "sonner";
import { useLogActivity } from "@/hooks/use-log-activity";
import { LoadingButton } from "@/components/composite/loading-button";
import { ConfirmDialog } from "@/components/composite/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shuffle, Trash2 } from "lucide-react";
import type { Division } from "@/types";

// ── Supabase 쿼리/뮤테이션 함수 ─────────────────────────────────────────────

async function fetchDivisions(orgChartId: string): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").eq("org_chart_id", orgChartId).order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function insertDivision(values: DivisionFormValues, orgChartId: string): Promise<void> {
	const supabase = createClient();
	const { data: maxData } = await supabase
		.from("divisions")
		.select("display_order")
		.eq("org_chart_id", orgChartId)
		.order("display_order", { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextOrder = (maxData?.display_order ?? 0) + 1;
	const { error } = await supabase.from("divisions").insert({
		name: values.name,
		color: values.color,
		org_chart_id: orgChartId,
		display_order: nextOrder,
	});
	if (error) throw error;
}

async function updateDivision(id: string, values: DivisionFormValues): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("divisions").update({ name: values.name, color: values.color }).eq("id", id);
	if (error) throw error;
}

async function deleteDivision(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("divisions").delete().eq("id", id);
	if (error) throw error;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface DivisionFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	division?: Division | null;
	orgChartId: string;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function DivisionFormDialog({ open, onOpenChange, division, orgChartId }: DivisionFormDialogProps) {
	const queryClient = useQueryClient();
	const log = useLogActivity();
	const isEdit = !!division;

	const { data: divisions = [] } = useQuery({
		queryKey: queryKeys.divisions.byOrgChart(orgChartId),
		queryFn: () => fetchDivisions(orgChartId),
	});

	const form = useForm<DivisionFormValues>({
		resolver: zodResolver(divisionSchema),
		defaultValues: {
			name: "",
			color: generateShuffleColor([]),
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				name: division?.name ?? "",
				color: division?.color ?? generateShuffleColor(divisions.map((d) => d.color)),
			});
		}
	}, [open, division, form, divisions]);

	const insertMutation = useMutation({
		mutationFn: (values: DivisionFormValues) => insertDivision(values, orgChartId),
		onSuccess: (_, values) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.divisions.byOrgChart(orgChartId) });
			toast.success("실이 생성되었습니다.");
			onOpenChange(false);
			// 실 등록 이력 기록
			log({ actionType: 'create', targetType: 'division', targetName: values.name, description: `실 '${values.name}' 등록` });
		},
		onError: () => toast.error("실 생성에 실패했습니다."),
	});

	const updateMutation = useMutation({
		mutationFn: (values: DivisionFormValues) => updateDivision(division!.id, values),
		onSuccess: (_, values) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.divisions.byOrgChart(orgChartId) });
			toast.success("실이 수정되었습니다.");
			onOpenChange(false);
			// 실 수정 이력 기록
			log({ actionType: 'update', targetType: 'division', targetId: division!.id, targetName: values.name, description: `실 '${values.name}' 수정` });
		},
		onError: () => toast.error("실 수정에 실패했습니다."),
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteDivision(division!.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.divisions.byOrgChart(orgChartId) });
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.byOrgChart(orgChartId) });
			toast.success("실이 삭제되었습니다.");
			onOpenChange(false);
			// 실 삭제 이력 기록
			log({ actionType: 'delete', targetType: 'division', targetId: division!.id, targetName: division!.name, description: `실 '${division!.name}' 삭제` });
		},
		onError: () => toast.error("실 삭제에 실패했습니다."),
	});

	const isPending = insertMutation.isPending || updateMutation.isPending;

	function onSubmit(values: DivisionFormValues) {
		if (isEdit) {
			updateMutation.mutate(values);
		} else {
			insertMutation.mutate(values);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? "실 수정" : "실 추가"}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>실 이름</FormLabel>
									<FormControl>
										<Input placeholder="예: 영업실" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="color"
							render={({ field }) => (
								<FormItem>
									<FormLabel>대표 색상</FormLabel>
									<FormControl>
										<div className="flex items-center gap-2">
											<input type="color" value={field.value} onChange={field.onChange} className="h-9 w-14 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1" />
											<Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" title="유사한 톤의 색상 랜덤 추천" onClick={() => field.onChange(generateShuffleColor(divisions.map((d) => d.color)))}>
												<Shuffle className="h-4 w-4" />
											</Button>
											<Input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="#6366f1" className="font-mono text-sm" maxLength={7} />
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter className="flex-row gap-2 pt-2">
							{isEdit && (
								<ConfirmDialog
									trigger={
										<Button type="button" variant="outline" size="sm" className="mr-auto text-destructive hover:text-destructive" disabled={deleteMutation.isPending}>
											<Trash2 className="mr-1 h-3 w-3" />
											삭제
										</Button>
									}
									title="실을 삭제하시겠습니까?"
									description="하위 팀의 소속 실이 해제되며 되돌릴 수 없습니다."
									confirmLabel="삭제"
									variant="destructive"
									onConfirm={() => deleteMutation.mutate()}
								/>
							)}
							<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
								취소
							</Button>
							<LoadingButton type="submit" isPending={isPending}>
								{isEdit ? "수정" : "추가"}
							</LoadingButton>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
