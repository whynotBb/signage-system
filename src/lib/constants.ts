import type { NavItem, SiteConfig } from '@/types'

export const SITE_CONFIG: SiteConfig = {
  name: '사이니지 관리 시스템',
  description: '사이니지 콘텐츠를 관리하는 웹 관리자 앱',
  url: 'http://localhost:3000',
}

// 관리자 사이드바 메뉴
export const NAV_ITEMS: NavItem[] = [
  { title: '대시보드', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  // 콘텐츠 관리 그룹
  { title: '조직도 관리', href: '/admin/org', icon: 'Users', group: '콘텐츠 관리', roles: ['super_admin', 'content_admin'] },
  { title: '뉴스 관리', href: '/admin/news', icon: 'Newspaper', group: '콘텐츠 관리' },
  { title: '방문자 관리', href: '/admin/visitor', icon: 'UserCheck', group: '콘텐츠 관리' },
  { title: '회사소개 관리', href: '/admin/company-intro', icon: 'Building2', group: '콘텐츠 관리', roles: ['super_admin', 'content_admin'] },
  { title: '동영상 관리', href: '/admin/video', icon: 'Video', group: '콘텐츠 관리', roles: ['super_admin', 'content_admin'] },
  { title: '이미지 관리', href: '/admin/image', icon: 'Image', group: '콘텐츠 관리', roles: ['super_admin', 'content_admin'] },
  // 시스템 관리 그룹
  { title: '사용자 관리', href: '/admin/users', icon: 'Shield', group: '시스템 관리', roles: ['super_admin'] },
]
