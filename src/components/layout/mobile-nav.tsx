'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { NAV_ITEMS, SITE_CONFIG } from '@/lib/constants'
import { NavLink } from './nav-link'
import { useAuthStore } from '@/store/auth-store'
import type { NavItem } from '@/types'

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const role = useAuthStore((s) => s.user?.role)

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  )

  const grouped = visibleItems.reduce<Record<string, NavItem[]>>((acc, item) => {
    const key = item.group ?? ''
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 bg-sidebar">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link
            href="/admin/dashboard"
            className="font-semibold text-sm text-sidebar-foreground"
            onClick={() => setOpen(false)}
          >
            {SITE_CONFIG.name}
          </Link>
        </div>
        <nav className="p-2 space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-1">
              {group && (
                <p className="px-3 py-1 text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider">
                  {group}
                </p>
              )}
              {items.map((item) => (
                <NavLink key={item.href} item={item} onClick={() => setOpen(false)} />
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
