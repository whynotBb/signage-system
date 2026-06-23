'use client'

import Link from 'next/link'
import { NAV_ITEMS, SITE_CONFIG } from '@/lib/constants'
import { ScrollArea } from '@/components/ui/scroll-area'
import { NavLink } from './nav-link'
import { useAuthStore } from '@/store/auth-store'
import type { NavItem } from '@/types'

export function Sidebar() {
  const role = useAuthStore((s) => s.user?.role)

  // roles 미지정 = 전 역할 접근 가능, roles 지정 = 해당 역할만 접근
  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  )

  const grouped = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.group ?? ''
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar min-h-screen">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/admin/dashboard" className="font-semibold text-sm text-sidebar-foreground">
          {SITE_CONFIG.name}
        </Link>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-1">
              {group && (
                <p className="px-3 py-1 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  )
}
