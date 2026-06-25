"use client"

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar"

interface NavSubItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
}

interface NavGroup {
  label?: string
  items: {
    title: string
    url: string
    icon?: LucideIcon
    isActive?: boolean
    children?: NavSubItem[]
  }[]
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const { isMobile, setOpenMobile } = useSidebar()

  function closeSidebarOnMobile() {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <>
      {groups.map((group, i) => (
        <SidebarGroup key={group.label ?? `group-${i}`}>
          {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                  <Link href={item.url} onClick={closeSidebarOnMobile}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {item.children && item.children.length > 0 && (
                  <SidebarMenuSub>
                    {item.children.map((child) => (
                      <SidebarMenuSubItem key={child.title}>
                        <SidebarMenuSubButton asChild isActive={child.isActive}>
                          <Link href={child.url} onClick={closeSidebarOnMobile}>
                            {child.icon && <child.icon />}
                            <span>{child.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                )}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
