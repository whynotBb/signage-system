"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Newspaper,
  UserCheck,
  Building2,
  Video,
  Image,
  Shield,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { NAV_ITEMS, SITE_CONFIG } from "@/lib/constants"
import { useAuthStore } from "@/store/auth-store"
import type { NavIconKey } from "@/types"

const iconMap: Record<NavIconKey, LucideIcon> = {
  LayoutDashboard,
  Users,
  Newspaper,
  UserCheck,
  Building2,
  Video,
  Image,
  Shield,
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const role = useAuthStore((s) => s.user?.role)
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  )

  // group별로 묶기: group이 없으면 '' 키로
  const groupMap = visibleItems.reduce<Record<string, typeof visibleItems>>(
    (acc, item) => {
      const key = item.group ?? ""
      ;(acc[key] ??= []).push(item)
      return acc
    },
    {}
  )

  // group 순서 유지: ''(그룹 없음) 먼저, 나머지는 등장 순
  const groupOrder = ["", ...Object.keys(groupMap).filter((k) => k !== "")]
  const navGroups = groupOrder
    .filter((key) => groupMap[key])
    .map((key) => ({
      label: key || undefined,
      items: groupMap[key].map((item) => ({
        title: item.title,
        url: item.href,
        icon: item.icon ? iconMap[item.icon] : undefined,
        isActive: pathname === item.href || pathname.startsWith(item.href + "/"),
      })),
    }))

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutDashboard className="size-4" />
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
  )
}
