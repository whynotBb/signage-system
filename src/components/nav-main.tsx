"use client"

import Link from "next/link"
import { ChevronDown } from "lucide-react"
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

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
    badge?: number
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
            {group.items.map((item) => {
              const hasChildren = !!item.children?.length

              if (!hasChildren) {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                      <Link href={item.url} onClick={closeSidebarOnMobile}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        {!!item.badge && (
                          <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              }

              return (
                <Collapsible key={item.title} asChild defaultOpen={false} className="group/collapsible">
                  <SidebarMenuItem>
                    <div className="relative">
                      <SidebarMenuButton asChild isActive={item.isActive} tooltip={item.title}>
                        <Link href={item.url} onClick={closeSidebarOnMobile}>
                          {item.icon && <item.icon />}
                          <span>{item.title}</span>
                          {!!item.badge && (
                            <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground hover:bg-muted group-data-[collapsible=icon]:hidden"
                        >
                          <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                          <span className="sr-only">하위 메뉴 펼치기</span>
                        </button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.children!.map((child) => (
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
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
