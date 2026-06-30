"use client";

import * as React from "react";
import Link from "next/link";
import NextImage from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserMinus, Newspaper, UserCheck, Building2, Video, Image, Shield, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { NAV_ITEMS, SITE_CONFIG } from "@/lib/constants";
import { useAuthStore } from "@/store/auth-store";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/supabase/query-keys";
import type { NavIconKey } from "@/types";

const iconMap: Record<NavIconKey, LucideIcon> = {
	LayoutDashboard,
	Users,
	UserMinus,
	Newspaper,
	UserCheck,
	Building2,
	Video,
	Image,
	Shield,
	History,
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const role = useAuthStore((s) => s.user?.role);
	const pathname = usePathname();

	const { data: pendingCount = 0 } = useQuery({
		queryKey: queryKeys.profiles.pendingCount(),
		queryFn: async () => {
			const supabase = createClient();
			const { count } = await supabase
				.from("profiles")
				.select("id", { count: "exact", head: true })
				.eq("is_active", false);
			return count ?? 0;
		},
		enabled: role === "super_admin",
		staleTime: 60_000,
	});

	const { data: orgCharts = [] } = useQuery({
		queryKey: queryKeys.orgCharts.all,
		queryFn: async () => {
			const supabase = createClient();
			const { data } = await supabase.from("org_charts").select("id, name").order("display_order", { ascending: true });
			return data ?? [];
		},
		enabled: role === "super_admin" || role === "content_admin",
		staleTime: 30_000,
	});

	const visibleItems = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))
		.map((item) => {
			if (item.href !== "/admin/org") return item;
			return {
				...item,
				children: [
					...orgCharts.map((c) => ({ title: c.name, href: `/admin/org/${c.id}`, icon: undefined, roles: undefined })),
					{ title: "퇴사자 관리", href: "/admin/org/resigned", icon: "UserMinus" as const, roles: ["super_admin", "content_admin"] as ("super_admin" | "content_admin" | "editor")[] },
				],
			};
		});

	// group별로 묶기: group이 없으면 '' 키로
	const groupMap = visibleItems.reduce<Record<string, typeof visibleItems>>((acc, item) => {
		const key = item.group ?? "";
		(acc[key] ??= []).push(item);
		return acc;
	}, {});

	// group 순서 유지: ''(그룹 없음) 먼저, 나머지는 등장 순
	const groupOrder = ["", ...Object.keys(groupMap).filter((k) => k !== "")];
	const navGroups = groupOrder
		.filter((key) => groupMap[key])
		.map((key) => ({
			label: key || undefined,
			items: groupMap[key].map((item) => ({
				title: item.title,
				url: item.href,
				icon: item.icon ? iconMap[item.icon] : undefined,
				isActive: pathname === item.href || pathname.startsWith(item.href + "/"),
				badge: item.href === "/admin/users" ? pendingCount : undefined,
				children: item.children
					?.filter((child) => !child.roles || (role && child.roles.includes(role)))
					.map((child) => ({
						title: child.title,
						url: child.href,
						icon: child.icon ? iconMap[child.icon] : undefined,
						isActive: pathname === child.href || pathname.startsWith(child.href + "/"),
					})),
			})),
		}));

	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/admin/dashboard">
								<div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded">
									<NextImage src="/logo_icon.png" alt="로고" width={32} height={32} className="object-contain" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{SITE_CONFIG.name}</span>
									<span className="truncate text-xs text-sidebar-foreground/60">hubilon</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain groups={navGroups} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
}
