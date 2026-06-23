'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Newspaper,
  UserCheck,
  Building2,
  Video,
  Image,
  Shield,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NavItem, NavIconKey } from '@/types'

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

interface NavLinkProps {
  item: NavItem
  onClick?: () => void
}

export function NavLink({ item, onClick }: NavLinkProps) {
  const pathname = usePathname()
  const Icon = item.icon ? iconMap[item.icon] : null
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {item.title}
    </Link>
  )
}
