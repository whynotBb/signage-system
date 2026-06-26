'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Bell, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { useAuthStore } from '@/store/auth-store'

async function fetchPendingCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', false)
  return count ?? 0
}

export function PendingUsersBanner() {
  const role = useAuthStore((s) => s.user?.role)

  const { data: count = 0 } = useQuery({
    queryKey: queryKeys.profiles.pendingCount(),
    queryFn: fetchPendingCount,
    enabled: role === 'super_admin',
    staleTime: 60_000,
  })

  if (role !== 'super_admin' || count === 0) return null

  return (
    <Link
      href="/admin/users"
      className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
    >
      <Bell className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        <span className="font-medium">승인 대기 목록이 있습니다.</span>
        <span className="ml-1 text-amber-600 dark:text-amber-400">
          ({count}명이 승인 대기 중)
        </span>
      </span>
      <span className="flex items-center gap-1 font-medium">
        사용자 관리
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  )
}
