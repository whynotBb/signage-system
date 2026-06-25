"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { visitorSchema, type VisitorFormValues } from "@/lib/validations/visitor";
import { toast } from "sonner";
import { LoadingButton } from "@/components/composite/loading-button";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import type { VisitorContent } from "@/types";

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string | null | undefined): string {
	if (!iso) return "";
	return iso.slice(0, 16);
}

// ── Supabase 함수 ─────────────────────────────────────────────────────────────

async function insertVisitor(values: VisitorFormValues): Promise<void> {
	const supabase = createClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) throw new Error("인증 정보가 없습니다.");

	const visitorNames = JSON.stringify(values.visitors.map((v) => v.name));
	const visitorTitles = JSON.stringify(values.visitors.map((v) => v.title));

	const { error } = await supabase.from("visitor_contents").insert({
		title: values.title,
		visitor_org: values.visitor_org,
		visitor_name: visitorNames,
		visitor_title: visitorTitles,
		location: values.location,
		scheduled_start_at: values.scheduled_start_at || null,
		scheduled_end_at: values.scheduled_end_at || null,
		visit_date: values.visit_date || null,
		is_active: values.is_active,
		created_by: user.id,
	});
	if (error) throw error;
}

async function updateVisitor(id: string, values: VisitorFormValues): Promise<void> {
	const supabase = createClient();
	const visitorNames = JSON.stringify(values.visitors.map((v) => v.name));
	const visitorTitles = JSON.stringify(values.visitors.map((v) => v.title));

	const { error } = await supabase
		.from("visitor_contents")
		.update({
			title: values.title,
			visitor_org: values.visitor_org,
			visitor_name: visitorNames,
			visitor_title: visitorTitles,
			location: values.location,
			scheduled_start_at: values.scheduled_start_at || null,
			scheduled_end_at: values.scheduled_end_at || null,
			visit_date: values.visit_date || null,
			is_active: values.is_active,
		})
		.eq("id", id);
	if (error) throw error;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VisitorFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	visitor?: VisitorContent | null;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function VisitorFormDialog({ open, onOpenChange, visitor }: VisitorFormDialogProps) {
	const queryClient = useQueryClient();
	const isEdit = !!visitor;

	const form = useForm<VisitorFormValues>({
		resolver: zodResolver(visitorSchema),
		defaultValues: {
			title: "방문을 환영합니다.",
			visitor_org: "",
			visitors: [{ name: "", title: "" }],
			location: "",
			scheduled_start_at: "",
			scheduled_end_at: "",
			visit_date: "",
			is_active: true,
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "visitors",
	});

	const scheduledStartAt = form.watch("scheduled_start_at");

	useEffect(() => {
		if (open) {
			let initialVisitors = [{ name: "", title: "" }];
			if (visitor) {
				let parsedNames: string[] = [];
				let parsedTitles: string[] = [];
				try {
					if (visitor.visitor_name.startsWith("[")) {
						parsedNames = JSON.parse(visitor.visitor_name);
					} else {
						parsedNames = visitor.visitor_name ? [visitor.visitor_name] : [];
					}
				} catch {
					parsedNames = visitor.visitor_name ? [visitor.visitor_name] : [];
				}

				try {
					if (visitor.visitor_title.startsWith("[")) {
						parsedTitles = JSON.parse(visitor.visitor_title);
					} else {
						parsedTitles = visitor.visitor_title ? [visitor.visitor_title] : [];
					}
				} catch {
					parsedTitles = visitor.visitor_title ? [visitor.visitor_title] : [];
				}

				if (parsedNames.length > 0) {
					initialVisitors = parsedNames.map((name, i) => ({
						name,
						title: parsedTitles[i] || "",
					}));
				}
			}

			form.reset({
				title: visitor?.title ?? "방문을 환영합니다.",
				visitor_org: visitor?.visitor_org ?? "",
				visitors: initialVisitors,
				location: visitor?.location ?? "",
				scheduled_start_at: toDatetimeLocal(visitor?.scheduled_start_at),
				scheduled_end_at: toDatetimeLocal(visitor?.scheduled_end_at),
				visit_date: visitor?.visit_date ?? "",
				is_active: visitor?.is_active ?? true,
			});
		}
	}, [open, visitor, form, isEdit]);

	const insertMutation = useMutation({
		mutationFn: insertVisitor,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() });
			toast.success("방문자 공지가 등록되었습니다.");
			onOpenChange(false);
		},
		onError: () => toast.error("방문자 공지 등록에 실패했습니다."),
	});

	const updateMutation = useMutation({
		mutationFn: (values: VisitorFormValues) => updateVisitor(visitor!.id, values),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.all });
			queryClient.invalidateQueries({ queryKey: queryKeys.visitors.activeCount() });
			toast.success("방문자 공지가 수정되었습니다.");
			onOpenChange(false);
		},
		onError: () => toast.error("방문자 공지 수정에 실패했습니다."),
	});

	const isPending = insertMutation.isPending || updateMutation.isPending;

	function onSubmit(values: VisitorFormValues) {
		if (isEdit) {
			updateMutation.mutate(values);
		} else {
			insertMutation.mutate(values);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? "방문자 공지 수정" : "방문자 공지 등록"}</DialogTitle>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
						<FormField
							control={form.control}
							name="title"
							render={({ field }) => (
								<FormItem>
									<FormLabel>방문 목적 / 제목</FormLabel>
									<FormControl>
										<Input placeholder="예) 본사 방문을 환영합니다" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="visitor_org"
							render={({ field }) => (
								<FormItem>
									<FormLabel>
										방문 기관 / 기업명 <span className="text-destructive">*</span>
									</FormLabel>
									<FormControl>
										<Input placeholder="예) 휴빌론 코리아" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium text-foreground">방문자 목록 (최대 3명)</span>

							{fields.map((fieldItem, index) => (
								<div key={fieldItem.id} className="flex items-end gap-2">
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
										<FormField
											control={form.control}
											name={`visitors.${index}.name`}
											render={({ field }) => (
												<FormItem>
													{index === 0 && <FormLabel className="text-xs">이름</FormLabel>}
													<FormControl>
														<Input placeholder="예) 홍길동" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name={`visitors.${index}.title`}
											render={({ field }) => (
												<FormItem>
													{index === 0 && <FormLabel className="text-xs">직책</FormLabel>}
													<FormControl>
														<Input placeholder="예) 대표이사" {...field} />
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>

									{/* 삭제 버튼 (2번째부터) */}
									{index === 0 ? (
										<div className="h-8 w-8 shrink-0" />
									) : (
										<Button
											type="button"
											variant="outline"
											size="icon"
											className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={() => remove(index)}
											title="방문자 삭제"
										>
											<Minus className="h-4 w-4" />
										</Button>
									)}
								</div>
							))}

							{/* + 추가 버튼 — 마지막 row의 이름이 입력된 경우에만 활성 */}
							{fields.length < 3 && (() => {
								const lastIdx = fields.length - 1
								const lastName = form.watch(`visitors.${lastIdx}.name`)
								return (
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-1 w-full gap-1.5 text-muted-foreground hover:text-foreground"
										disabled={!lastName?.trim()}
										onClick={() => append({ name: "", title: "" })}
									>
										<Plus className="h-3.5 w-3.5" />
										방문자 추가
									</Button>
								)
							})()}
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="visit_date"
								render={({ field }) => (
									<FormItem>
										<FormLabel>방문일</FormLabel>
										<FormControl>
											<DatePicker
												value={field.value ?? ""}
												onChange={field.onChange}
												placeholder="방문일 선택"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="location"
								render={({ field }) => {
									const locationOptions = ["회의실 Ⅰ", "회의실 Ⅱ", "회의실 Ⅲ"];
									const showCustomOption = field.value && !locationOptions.includes(field.value);
									return (
										<FormItem>
											<FormLabel>방문 장소</FormLabel>
											<Select onValueChange={field.onChange} value={field.value || ""}>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="방문 장소를 선택해주세요" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{locationOptions.map((opt) => (
														<SelectItem key={opt} value={opt}>
															{opt}
														</SelectItem>
													))}
													{showCustomOption && <SelectItem value={field.value}>{field.value}</SelectItem>}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									);
								}}
							/>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<FormField
								control={form.control}
								name="scheduled_start_at"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											게시 시작 일시 <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<DateTimePicker
												value={field.value ?? ""}
												onChange={field.onChange}
												placeholder="시작 일시 선택"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="scheduled_end_at"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											게시 종료 일시 <span className="text-destructive">*</span>
										</FormLabel>
										<FormControl>
											<DateTimePicker
												value={field.value ?? ""}
												onChange={field.onChange}
												min={scheduledStartAt || undefined}
												placeholder="종료 일시 선택"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>

						<FormField
							control={form.control}
							name="is_active"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
									<div className="space-y-0.5">
										<FormLabel>활성 상태</FormLabel>
										<p className="text-[0.8rem] text-muted-foreground">활성화 시 디스플레이 화면에 노출됩니다.</p>
									</div>
									<FormControl>
										<Switch checked={field.value} onCheckedChange={field.onChange} aria-label="활성 상태 토글" />
									</FormControl>
								</FormItem>
							)}
						/>

						<DialogFooter className="pt-2">
							<LoadingButton type="submit" isPending={isPending} className="w-full sm:w-auto">
								{isEdit ? "수정 완료" : "등록 완료"}
							</LoadingButton>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
