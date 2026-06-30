"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { orgChartSchema, type OrgChartFormValues } from "@/lib/validations/org";
import { toast } from "sonner";
import { useLogActivity } from "@/hooks/use-log-activity";
import { LoadingButton } from "@/components/composite/loading-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { OrgChart } from "@/types";

type CreateMode = "empty" | "copy";

async function fetchActiveOrgChart(): Promise<OrgChart | null> {
	const supabase = createClient();
	const { data } = await supabase.from("org_charts").select("*").eq("is_display_active", true).maybeSingle();
	return data ?? null;
}

async function createEmptyOrgChart(name: string): Promise<string> {
	const supabase = createClient();
	const { data: maxData } = await supabase
		.from("org_charts")
		.select("display_order")
		.order("display_order", { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextOrder = (maxData?.display_order ?? 0) + 1;
	const { data, error } = await supabase
		.from("org_charts")
		.insert({ name, display_order: nextOrder })
		.select("id")
		.single();
	if (error) throw error;
	return data.id;
}

async function copyOrgChart(sourceId: string, name: string): Promise<string> {
	const supabase = createClient();
	const { data, error } = await supabase.rpc("duplicate_org_chart", { source_id: sourceId, new_name: name });
	if (error) throw error;
	return data as string;
}

interface OrgChartCreateDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function OrgChartCreateDialog({ open, onOpenChange }: OrgChartCreateDialogProps) {
	const queryClient = useQueryClient();
	const log = useLogActivity();
	const [mode, setMode] = useState<CreateMode>("empty");

	const { data: activeChart } = useQuery({
		queryKey: [...queryKeys.orgCharts.all, "active"],
		queryFn: fetchActiveOrgChart,
		enabled: open,
	});

	const form = useForm<OrgChartFormValues>({
		resolver: zodResolver(orgChartSchema),
		defaultValues: { name: "", description: "" },
	});

	const mutation = useMutation({
		mutationFn: async (values: OrgChartFormValues) => {
			if (mode === "copy" && activeChart) {
				return copyOrgChart(activeChart.id, values.name);
			}
			return createEmptyOrgChart(values.name);
		},
		onSuccess: (newId, values) => {
			queryClient.invalidateQueries({ queryKey: queryKeys.orgCharts.all });
			toast.success("조직도가 생성되었습니다.");
			form.reset();
			onOpenChange(false);
			// 조직도 생성/복사 이력 기록
			if (mode === "copy") {
				log({ actionType: 'create', targetType: 'org_chart', targetId: newId, targetName: values.name, description: `조직도 '${values.name}' 복사 생성` });
			} else {
				log({ actionType: 'create', targetType: 'org_chart', targetId: newId, targetName: values.name, description: `조직도 '${values.name}' 생성` });
			}
		},
		onError: () => toast.error("조직도 생성에 실패했습니다."),
	});

	function onSubmit(values: OrgChartFormValues) {
		mutation.mutate(values);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>조직도 추가</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>조직도 이름</FormLabel>
									<FormControl>
										<Input placeholder="예: 대외용, 내부용, 감사용" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="space-y-2">
							<Label className="text-sm font-medium">생성 방식</Label>
							<RadioGroup value={mode} onValueChange={(v) => setMode(v as CreateMode)} className="flex flex-col gap-2">
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="empty" id="mode-empty" />
									<Label htmlFor="mode-empty" className="cursor-pointer font-normal">
										빈 조직도로 시작
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="copy" id="mode-copy" disabled={!activeChart} />
									<Label htmlFor="mode-copy" className={`cursor-pointer font-normal ${!activeChart ? "text-muted-foreground" : ""}`}>
										현재 표출 버전 복사
										{activeChart && <span className="ml-1 text-xs text-muted-foreground">({activeChart.name})</span>}
										{!activeChart && <span className="ml-1 text-xs text-muted-foreground">(표출 중인 조직도 없음)</span>}
									</Label>
								</div>
							</RadioGroup>
						</div>

						<DialogFooter className="pt-2">
							<LoadingButton type="submit" isPending={mutation.isPending}>
								추가
							</LoadingButton>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
