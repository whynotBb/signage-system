export const queryKeys = {
  profiles: {
    all: ['profiles'] as const,
    detail: (id: string) => ['profiles', id] as const,
    pendingCount: () => ['profiles', 'pending-count'] as const,
  },
  orgCharts: {
    all: ['org_charts'] as const,
    detail: (id: string) => ['org_charts', id] as const,
  },
  divisions: {
    all: ['divisions'] as const,
    byOrgChart: (orgChartId: string) => ['divisions', { orgChartId }] as const,
    detail: (id: string) => ['divisions', id] as const,
  },
  teams: {
    all: ['teams'] as const,
    byOrgChart: (orgChartId: string) => ['teams', { orgChartId }] as const,
    byDivision: (divisionId: string) => ['teams', { divisionId }] as const,
    detail: (id: string) => ['teams', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    byOrgChart: (orgChartId: string) => ['employees', { orgChartId }] as const,
    byDivision: (divisionId: string) => ['employees', { divisionId }] as const,
    byTeam: (teamId: string) => ['employees', { teamId }] as const,
    detail: (id: string) => ['employees', id] as const,
    resigned: () => ['employees', { is_resigned: true }] as const,
    // 퇴사자 제외 활성 직원 수 (orgChartId: 표출 활성화된 조직도 기준)
    activeCount: (orgChartId?: string | null) => ['employees', 'count', { active: true, orgChartId: orgChartId ?? null }] as const,
  },
  news: {
    all: ['news_contents'] as const,
    active: () => ['news_contents', { is_active: true }] as const,
    detail: (id: string) => ['news_contents', id] as const,
    // 활성 뉴스 수
    activeCount: () => ['news_contents', 'count', { is_active: true }] as const,
    // 대시보드 전용 요약 조회 — news-table.tsx의 all(전체 컬럼) 키와 겹치면
    // select 컬럼이 다른 두 쿼리가 캐시를 공유해 날짜/등록자 등이 빠진 얕은 데이터로 덮여버림
    summary: () => ['news_contents', 'summary'] as const,
  },
  visitors: {
    all: ['visitor_contents'] as const,
    active: () => ['visitor_contents', { is_active: true }] as const,
    detail: (id: string) => ['visitor_contents', id] as const,
    // 활성 방문자 공지 수
    activeCount: () => ['visitor_contents', 'count', { is_active: true }] as const,
    // 대시보드 전용 요약 조회 (news.summary와 동일한 이유)
    summary: () => ['visitor_contents', 'summary'] as const,
  },
  companyIntro: {
    config: () => ['company_intro_config'] as const,
  },
  signageGroupOrder: {
    all: ['signage_group_order'] as const,
  },
  videos: {
    all: ['video_contents'] as const,
    active: () => ['video_contents', { is_active: true }] as const,
    detail: (id: string) => ['video_contents', id] as const,
    // 활성 동영상 수
    activeCount: () => ['video_contents', 'count', { is_active: true }] as const,
    // 대시보드 전용 요약 조회 (news.summary와 동일한 이유)
    summary: () => ['video_contents', 'summary'] as const,
  },
  images: {
    all: ['image_contents'] as const,
    active: () => ['image_contents', { is_active: true }] as const,
    detail: (id: string) => ['image_contents', id] as const,
    // 활성 이미지 수
    activeCount: () => ['image_contents', 'count', { is_active: true }] as const,
    // 대시보드 전용 요약 조회 (news.summary와 동일한 이유)
    summary: () => ['image_contents', 'summary'] as const,
  },
  activityLogs: {
    all: ['activity_logs'] as const,
    list: (filters?: Record<string, unknown>) => ['activity_logs', 'list', filters] as const,
  },
} as const
