'use client'

import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/supabase/query-keys'
import { useAuthStore } from '@/store/auth-store'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
  CardAction,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { Users, Newspaper, UserCheck, Video, Image } from 'lucide-react'
import type { UserRole } from '@/types'

// 역할별 한국어 레이블 매핑
const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: '슈퍼어드민',
  content_admin: '콘텐츠어드민',
  editor: '편집자',
}

// 통계 카드 설정 상수
const STAT_CARDS = [
  { key: 'employees', label: '재직 직원', icon: Users, href: '/admin/org' },
  { key: 'news', label: '활성 뉴스', icon: Newspaper, href: '/admin/news' },
  { key: 'visitors', label: '방문자 공지', icon: UserCheck, href: '/admin/visitor' },
  { key: 'videos', label: '동영상', icon: Video, href: '/admin/video' },
  { key: 'images', label: '이미지', icon: Image, href: '/admin/image' },
] as const

// ── Supabase Count 쿼리 함수 ────────────────────────────────────────────────

/** 표출 활성화된 조직도의 퇴사자 제외 직원 수 조회 */
async function fetchActiveEmployeesCount(): Promise<number> {
  const supabase = createClient()
  const { data: activeChart } = await supabase
    .from('org_charts')
    .select('id')
    .eq('is_display_active', true)
    .maybeSingle()
  if (!activeChart) return 0
  const { count } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('org_chart_id', activeChart.id)
    .eq('is_resigned', false)
  return count ?? 0
}

/** 활성 뉴스 수 조회 */
async function fetchActiveNewsCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('news_contents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  return count ?? 0
}

/** 활성 방문자 공지 수 조회 */
async function fetchActiveVisitorsCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('visitor_contents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  return count ?? 0
}

/** 활성 동영상 수 조회 */
async function fetchActiveVideosCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('video_contents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  return count ?? 0
}

/** 활성 이미지 수 조회 */
async function fetchActiveImagesCount(): Promise<number> {
  const supabase = createClient()
  const { count } = await supabase
    .from('image_contents')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  return count ?? 0
}

// ── DashboardStats 컴포넌트 ────────────────────────────────────────────────

export function DashboardStats() {
  // auth-store에서 현재 로그인 사용자 정보 읽기
  const user = useAuthStore((s) => s.user)

  // 5개 독립 useQuery — TanStack Query가 병렬로 실행
  const employeesQuery = useQuery({
    queryKey: queryKeys.employees.activeCount(),
    queryFn: fetchActiveEmployeesCount,
  })
  const newsQuery = useQuery({
    queryKey: queryKeys.news.activeCount(),
    queryFn: fetchActiveNewsCount,
  })
  const visitorsQuery = useQuery({
    queryKey: queryKeys.visitors.activeCount(),
    queryFn: fetchActiveVisitorsCount,
  })
  const videosQuery = useQuery({
    queryKey: queryKeys.videos.activeCount(),
    queryFn: fetchActiveVideosCount,
  })
  const imagesQuery = useQuery({
    queryKey: queryKeys.images.activeCount(),
    queryFn: fetchActiveImagesCount,
  })

  // STAT_CARDS 순서와 동일하게 배열 구성
  const queries = [employeesQuery, newsQuery, visitorsQuery, videosQuery, imagesQuery]

  return (
    <div className="flex flex-col gap-4">
      {/* 현재 사용자 역할 표시 (로그인 상태일 때만 렌더링) */}
      {user?.role && (
        <p className="text-sm text-muted-foreground">
          현재 역할:{' '}
          <span className="font-medium text-foreground">{ROLE_LABEL[user.role]}</span>
        </p>
      )}

      {/* 통계 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STAT_CARDS.map((card, i) => {
          const { data: count, isLoading, isError } = queries[i]
          const Icon = card.icon

          return (
            <Link key={card.key} href={card.href}>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardHeader>
                  <CardDescription>{card.label}</CardDescription>
                  <CardAction>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">
                      {isError ? '-' : count}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
