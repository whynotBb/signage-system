import type { UserRole } from './database'

export * from './database'

export type NavIconKey =
  | 'LayoutDashboard'
  | 'Users'
  | 'UserMinus'
  | 'Newspaper'
  | 'UserCheck'
  | 'Building2'
  | 'Video'
  | 'Image'
  | 'Shield'

export interface NavItem {
  title: string
  href: string
  icon?: NavIconKey
  group?: string
  roles?: UserRole[]  // undefined이면 전 역할 접근 가능
  disabled?: boolean
  external?: boolean
  children?: Omit<NavItem, 'children' | 'group'>[]
}

export interface SiteConfig {
  name: string
  description: string
  url: string
}

export type Theme = 'light' | 'dark' | 'system'
