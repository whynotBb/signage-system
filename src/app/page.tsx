import './signage.css'
import { createClient } from '@/lib/supabase/server'
import { SignageDisplay } from '@/components/display/SignageDisplay'

export default async function DisplayPage() {
  const supabase = await createClient()
  const now = new Date()

  // 표출 활성화된 조직도 버전 조회
  const { data: activeChart } = await supabase
    .from('org_charts')
    .select('id')
    .eq('is_display_active', true)
    .maybeSingle()

  const activeOrgChartId = activeChart?.id ?? null

  const [divsRes, teamsRes, empsRes, configRes, newsRes, visitorRes] = await Promise.all([
    activeOrgChartId
      ? supabase.from('divisions').select('*').eq('org_chart_id', activeOrgChartId).order('display_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    activeOrgChartId
      ? supabase.from('teams').select('*').eq('org_chart_id', activeOrgChartId).order('display_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    activeOrgChartId
      ? supabase.from('employees').select('*').eq('org_chart_id', activeOrgChartId).eq('is_resigned', false).order('display_order', { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase.from('company_intro_config').select('*').single(),
    supabase.from('news_contents').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('visitor_contents').select('*').eq('is_active', true).order('display_order', { ascending: true }).order('created_at', { ascending: false }),
  ])

  // 게시 스케줄 필터링 (null이면 상시 표시)
  const activeNews = (newsRes.data ?? []).filter((n) => {
    if (n.scheduled_start_at && new Date(n.scheduled_start_at) > now) return false
    if (n.scheduled_end_at && new Date(n.scheduled_end_at) < now) return false
    return true
  })

  // 방문자는 게시 기간이 필수
  const activeVisitors = (visitorRes.data ?? []).filter((v) => {
    if (!v.scheduled_start_at || !v.scheduled_end_at) return false
    return new Date(v.scheduled_start_at) <= now && new Date(v.scheduled_end_at) >= now
  })

  return (
    <SignageDisplay
      divisions={divsRes.data ?? []}
      teams={teamsRes.data ?? []}
      employees={empsRes.data ?? []}
      showSafeInsight={configRes.data?.safeinsight_enabled ?? true}
      showInGuide={configRes.data?.inguide_enabled ?? true}
      newsItems={activeNews}
      visitorItems={activeVisitors}
    />
  )
}
