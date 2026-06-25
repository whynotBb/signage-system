"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import { employeeSchema, type EmployeeFormValues } from "@/lib/validations/org";
import { toast } from "sonner";
import { CropDialog } from "./crop-dialog";
import { LoadingButton } from "@/components/composite/loading-button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import type { Division, Team, Employee } from "@/types";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const POSITION_OPTIONS = ["사원", "주임", "대리", "과장", "차장", "부장", "이사", "대표", "부대표"] as const;
const EXECUTIVE_POSITIONS = ["대표", "부대표"] as const;
const POSITION_ORG_ROLE: Record<string, EmployeeFormValues["org_role"]> = {
	대표: "representative",
	부대표: "vice_representative",
};
const TITLE_OPTIONS = ["실장", "팀장"] as const;

// ── Supabase 쿼리/뮤테이션 함수 ──────────────────────────────────────────────

async function fetchDivisions(): Promise<Division[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("divisions").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function fetchTeams(): Promise<Team[]> {
	const supabase = createClient();
	const { data, error } = await supabase.from("teams").select("*").order("display_order", { ascending: true });
	if (error) throw error;
	return data ?? [];
}

async function uploadProfileImage(employeeId: string, blob: Blob): Promise<string> {
	const supabase = createClient();
	const ext = "jpg";
	const path = `${employeeId}/profile.${ext}`;

	const { error: uploadError } = await supabase.storage.from("employees").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
	if (uploadError) throw uploadError;

	const { data } = supabase.storage.from("employees").getPublicUrl(path);
	// 캐시 버스팅용 타임스탬프 쿼리 파라미터 추가
	return `${data.publicUrl}?t=${Date.now()}`;
}

async function insertEmployee(values: EmployeeFormValues, profileBlob: Blob | null): Promise<void> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from("employees")
		.insert({
			name: values.name,
			title: values.title,
			position: values.position,
			division_id: values.division_id,
			team_id: values.team_id,
			org_role: values.org_role,
			hired_at: values.hired_at,
			is_dispatched: values.is_dispatched,
			is_resigned: values.is_resigned,
		})
		.select("id")
		.single();
	if (error) throw error;

	if (profileBlob && data?.id) {
		try {
			const url = await uploadProfileImage(data.id, profileBlob);
			await supabase.from("employees").update({ profile_image_url: url }).eq("id", data.id);
		} catch (imgErr) {
			console.error("프로필 이미지 업로드 실패 (Storage 정책 확인 필요):", imgErr);
		}
	}
}

async function updateEmployee(id: string, values: EmployeeFormValues, profileBlob: Blob | null): Promise<void> {
	const supabase = createClient();

	let profile_image_url: string | undefined;
	if (profileBlob) {
		try {
			profile_image_url = await uploadProfileImage(id, profileBlob);
		} catch (imgErr) {
			console.error("프로필 이미지 업로드 실패 (Storage 정책 확인 필요):", imgErr);
		}
	}

	const { error } = await supabase
		.from("employees")
		.update({
			name: values.name,
			title: values.title,
			position: values.position,
			division_id: values.division_id,
			team_id: values.team_id,
			org_role: values.org_role,
			hired_at: values.hired_at,
			is_dispatched: values.is_dispatched,
			is_resigned: values.is_resigned,
			...(profile_image_url ? { profile_image_url } : {}),
		})
		.eq("id", id);
	if (error) throw error;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EmployeeFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	employee?: Employee | null;
	defaultDivisionId?: string | null;
	defaultTeamId?: string | null;
	allEmployees?: Employee[];
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function EmployeeFormDialog({ open, onOpenChange, employee, defaultDivisionId, defaultTeamId, allEmployees = [] }: EmployeeFormDialogProps) {
	const queryClient = useQueryClient();
	const isEdit = !!employee;
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [cropSrc, setCropSrc] = useState<string | null>(null);
	const [cropOpen, setCropOpen] = useState(false);
	const [profileBlob, setProfileBlob] = useState<Blob | null>(null);

	const { data: divisions = [] } = useQuery({
		queryKey: queryKeys.divisions.all,
		queryFn: fetchDivisions,
	});

	const { data: teams = [] } = useQuery({
		queryKey: queryKeys.teams.all,
		queryFn: fetchTeams,
	});

	const form = useForm<EmployeeFormValues>({
		resolver: zodResolver(employeeSchema),
		defaultValues: {
			name: "",
			title: "",
			position: "",
			division_id: null,
			team_id: null,
			org_role: "member",
			hired_at: "",
			is_dispatched: false,
			is_resigned: false,
		},
	});

	const watchedDivisionId = useWatch({ control: form.control, name: "division_id" });
	const watchedPosition = useWatch({ control: form.control, name: "position" });
	const watchedTitle = useWatch({ control: form.control, name: "title" });
	const isExecutive = (EXECUTIVE_POSITIONS as readonly string[]).includes(watchedPosition ?? "");
	const isManager = watchedTitle === "실장";

	// 이미 대표/부대표인 직원 존재 여부 (편집 중인 본인은 제외)
	const existingRepId = allEmployees.find((e) => e.org_role === "representative" && e.id !== employee?.id)?.id;
	const existingViceRepId = allEmployees.find((e) => e.org_role === "vice_representative" && e.id !== employee?.id)?.id;

	const filteredTeams = teams.filter((t) => watchedDivisionId === null || t.division_id === watchedDivisionId);

	useEffect(() => {
		if (open) {
			form.reset({
				name: employee?.name ?? "",
				title: employee?.title ?? "",
				position: employee?.position ?? "",
				division_id: employee?.division_id ?? defaultDivisionId ?? null,
				team_id: employee?.team_id ?? defaultTeamId ?? null,
				org_role: (employee?.org_role as EmployeeFormValues["org_role"]) ?? "member",
				hired_at: employee?.hired_at?.slice(0, 10) ?? "",
				is_dispatched: employee?.is_dispatched ?? false,
				is_resigned: employee?.is_resigned ?? false,
			});
			setPreviewUrl(employee?.profile_image_url ?? null);
			setProfileBlob(null);
		}
	}, [open, employee, defaultDivisionId, defaultTeamId, form]);

	function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		const objectUrl = URL.createObjectURL(file);
		setCropSrc(objectUrl);
		setCropOpen(true);
		e.target.value = "";
	}

	function handleCropComplete(blob: Blob) {
		setProfileBlob(blob);
		const url = URL.createObjectURL(blob);
		setPreviewUrl(url);
	}

	const insertMutation = useMutation({
		mutationFn: (values: EmployeeFormValues) => insertEmployee(values, profileBlob),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
			toast.success("직원이 등록되었습니다.");
			onOpenChange(false);
		},
		onError: (err) => {
			console.error("직원 등록 오류:", err);
			toast.error("직원 등록에 실패했습니다.");
		},
	});

	const updateMutation = useMutation({
		mutationFn: (values: EmployeeFormValues) => updateEmployee(employee!.id, values, profileBlob),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
			toast.success("직원 정보가 수정되었습니다.");
			onOpenChange(false);
		},
		onError: (err) => {
			console.error("직원 수정 오류:", err);
			toast.error("직원 수정에 실패했습니다.");
		},
	});

	const isPending = insertMutation.isPending || updateMutation.isPending;

	function onSubmit(values: EmployeeFormValues) {
		if (isEdit) {
			updateMutation.mutate(values);
		} else {
			insertMutation.mutate(values);
		}
	}

	return (
		<>
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{isEdit ? "직원 수정" : "직원 추가"}</DialogTitle>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
							{/* 프로필 사진 */}
							<div className="flex items-center gap-4">
								<Avatar className="h-16 w-16">
									<AvatarImage src={previewUrl ?? undefined} />
									<AvatarFallback className="text-lg">{form.watch("name").slice(0, 2) || "?"}</AvatarFallback>
								</Avatar>
								<div>
									<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
									<Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
										<Upload className="mr-2 h-3 w-3" />
										사진 업로드
									</Button>
									<p className="mt-1 text-xs text-muted-foreground">원형으로 크롭됩니다</p>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												이름 <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input placeholder="홍길동" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="position"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												직위 <span className="text-destructive">*</span>
											</FormLabel>
											<Select
												value={field.value ?? ""}
												onValueChange={(v) => {
													field.onChange(v);
													const role = POSITION_ORG_ROLE[v] ?? "member";
													form.setValue("org_role", role);
													if (POSITION_ORG_ROLE[v]) {
														form.setValue("title", "");
														form.setValue("division_id", null);
														form.setValue("team_id", null);
													}
												}}
											>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="직위 선택" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{POSITION_OPTIONS.map((p) => {
														const disabled =
															(p === "대표" && !!existingRepId) ||
															(p === "부대표" && !!existingViceRepId);
														return (
															<SelectItem key={p} value={p} disabled={disabled}>
																{p}{disabled ? " (이미 지정됨)" : ""}
															</SelectItem>
														);
													})}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem>
											<FormLabel>직책</FormLabel>
											<Select
												disabled={isExecutive}
												value={field.value || "__none__"}
												onValueChange={(v) => {
													const title = v === "__none__" ? "" : v;
													field.onChange(title);
													if (title === "실장") form.setValue("team_id", null);
												}}
											>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="직책 선택" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="__none__">없음</SelectItem>
													{TITLE_OPTIONS.map((t) => (
														<SelectItem key={t} value={t}>
															{t}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="hired_at"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												입사일 <span className="text-destructive">*</span>
											</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<FormField
									control={form.control}
									name="division_id"
									render={({ field }) => (
										<FormItem>
											<FormLabel>소속 실</FormLabel>
											<Select
												disabled={isExecutive}
												value={field.value ?? "__none__"}
												onValueChange={(v) => {
													field.onChange(v === "__none__" ? null : v);
													form.setValue("team_id", null);
												}}
											>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="실 선택" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="__none__">없음</SelectItem>
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

								<FormField
									control={form.control}
									name="team_id"
									render={({ field }) => (
										<FormItem>
											<FormLabel>소속 팀</FormLabel>
											<Select disabled={isExecutive || isManager} value={field.value ?? "__none__"} onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue placeholder="팀 선택" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="__none__">없음 (실 직속)</SelectItem>
													{filteredTeams.map((t) => (
														<SelectItem key={t.id} value={t.id}>
															{t.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{isEdit && (
								<div className="flex gap-6 rounded-md border border-border p-3">
									{!isExecutive && (
										<FormField
											control={form.control}
											name="is_dispatched"
											render={({ field }) => (
												<FormItem className="flex items-center gap-2 space-y-0">
													<FormControl>
														<Switch checked={field.value} onCheckedChange={field.onChange} />
													</FormControl>
													<Label className="cursor-pointer text-sm">파견 중</Label>
												</FormItem>
											)}
										/>
									)}
									<FormField
										control={form.control}
										name="is_resigned"
										render={({ field }) => (
											<FormItem className="flex items-center gap-2 space-y-0">
												<FormControl>
													<Switch checked={field.value} onCheckedChange={field.onChange} />
												</FormControl>
												<Label className="cursor-pointer text-sm">퇴사</Label>
											</FormItem>
										)}
									/>
								</div>
							)}

							<DialogFooter className="flex-row gap-2 pt-2">
								<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
									취소
								</Button>
								<LoadingButton type="submit" isPending={isPending}>
									{isEdit ? "수정" : "등록"}
								</LoadingButton>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>

			{cropSrc && <CropDialog open={cropOpen} onOpenChange={setCropOpen} imageSrc={cropSrc} onCropComplete={handleCropComplete} />}
		</>
	);
}
