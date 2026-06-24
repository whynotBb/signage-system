"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { teamSchema, type TeamFormValues } from "@/lib/validations/org";
import { toast } from "sonner";
import { LoadingButton } from "@/components/composite/loading-button";
import { ConfirmDialog } from "@/components/composite/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Division, Team } from "@/types";

// ── Supabase 쿼리/뮤테이션 함수 ──────────────────────────────────────────────

async function fetchDivisions(): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function insertTeam(values: TeamFormValues): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("teams").insert({
		name: values.name,
		division_id: values.division_id,
	});
	if (error) throw error;
}

async function updateTeam(id: string, values: TeamFormValues): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("teams").update({ name: values.name, division_id: values.division_id }).eq("id", id);
	if (error) throw error;
}

async function deleteTeam(id: string): Promise<void> {
	const supabase = createClient();
	const { error } = await supabase.from("teams").delete().eq("id", id);
	if (error) throw error;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TeamFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	team?: Team | null;
	defaultDivisionId?: string | null;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function TeamFormDialog({ open, onOpenChange, team, defaultDivisionId }: TeamFormDialogProps) {
	const queryClient = useQueryClient();
	const isEdit = !!team;

	const { data: divisions = [] } = useQuery({
		queryKey: queryKeys.divisions.all,
		queryFn: fetchDivisions,
	});

	const form = useForm<TeamFormValues>({
		resolver: zodResolver(teamSchema),
		defaultValues: {
			name: "",
			division_id: null,
		},
	});

	useEffect(() => {
		if (open) {
			form.reset({
				name: team?.name ?? "",
				division_id: team?.division_id ?? defaultDivisionId ?? null,
			});
		}
	}, [open, team, defaultDivisionId, form]);

	const insertMutation = useMutation({
		mutationFn: insertTeam,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
			toast.success("팀이 생성되었습니다.");
			onOpenChange(false);
		},
		onError: () => toast.error("팀 생성에 실패했습니다."),
	});

	const updateMutation = useMutation({
		mutationFn: (values: TeamFormValues) => updateTeam(team!.id, values),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
			toast.success("팀이 수정되었습니다.");
			onOpenChange(false);
		},
		onError: () => toast.error("팀 수정에 실패했습니다."),
	});

	const deleteMutation = useMutation({
		mutationFn: () => deleteTeam(team!.id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.teams.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
			toast.success("팀이 삭제되었습니다.");
			onOpenChange(false);
		},
		onError: () => toast.error("팀 삭제에 실패했습니다."),
	});

	const isPending = insertMutation.isPending || updateMutation.isPending;

	function onSubmit(values: TeamFormValues) {
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
					<DialogTitle>{isEdit ? "팀 수정" : "팀 추가"}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>팀 이름</FormLabel>
									<FormControl>
										<Input placeholder="예: 영업1팀" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="division_id"
							render={({ field }) => (
								<FormItem>
									<FormLabel>소속 실</FormLabel>
									<Select value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}>
										<FormControl>
											<SelectTrigger className="w-full">
												<SelectValue placeholder="소속 실 선택" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="__none__">실 없음 (독립 팀)</SelectItem>
											{divisions.map((d) => (
												<SelectItem key={d.id} value={d.id}>
													{d.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
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
									title="팀을 삭제하시겠습니까?"
									description="팀 소속 직원의 팀 배정이 해제되며 되돌릴 수 없습니다."
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
