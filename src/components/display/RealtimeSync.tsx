'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const WATCHED_TABLES = [
  'org_charts',
  'divisions',
  'teams',
  'employees',
  'company_intro_config',
  'news_contents',
  'visitor_contents',
]

export function RealtimeSync() {
  const router = useRouter()
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  useEffect(() => {
    // 사이니지는 인증 불필요 — @supabase/supabase-js 표준 클라이언트로 직접 생성하여
    // SSR 래퍼의 세션 복원/갱신 시도를 완전히 우회한다
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )
    let channel: ReturnType<typeof supabase.channel>

    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      refreshTimer.current = setTimeout(() => {
        router.refresh()
        refreshTimer.current = null
      }, 300)
    }

    const setupChannel = () => {
      if (channel) supabase.removeChannel(channel)

      channel = supabase.channel('signage-display-sync')
      WATCHED_TABLES.forEach((table) => {
        channel.on(
          'postgres_changes' as const,
          { event: '*', schema: 'public', table },
          scheduleRefresh
        )
      })
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          retryCount.current = 0
          router.refresh()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          const delay = Math.min(1000 * 2 ** retryCount.current, 30_000)
          retryCount.current += 1
          retryTimer.current = setTimeout(setupChannel, delay)
        }
      })
    }

    setupChannel()

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        router.refresh()
        if (channel.state === 'closed' || channel.state === 'errored') {
          setupChannel()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current)
      if (retryTimer.current) clearTimeout(retryTimer.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
