export const queryKeys = {
  profiles: {
    all: ['profiles'] as const,
    detail: (id: string) => ['profiles', id] as const,
  },
  divisions: {
    all: ['divisions'] as const,
    detail: (id: string) => ['divisions', id] as const,
  },
  teams: {
    all: ['teams'] as const,
    byDivision: (divisionId: string) => ['teams', { divisionId }] as const,
    detail: (id: string) => ['teams', id] as const,
  },
  employees: {
    all: ['employees'] as const,
    byDivision: (divisionId: string) => ['employees', { divisionId }] as const,
    byTeam: (teamId: string) => ['employees', { teamId }] as const,
    detail: (id: string) => ['employees', id] as const,
    resigned: () => ['employees', { is_resigned: true }] as const,
    // 파견/퇴사 제외 활성 직원 수
    activeCount: () => ['employees', 'count', { active: true }] as const,
  },
  news: {
    all: ['news_contents'] as const,
    active: () => ['news_contents', { is_active: true }] as const,
    detail: (id: string) => ['news_contents', id] as const,
    // 활성 뉴스 수
    activeCount: () => ['news_contents', 'count', { is_active: true }] as const,
  },
  visitors: {
    all: ['visitor_contents'] as const,
    active: () => ['visitor_contents', { is_active: true }] as const,
    detail: (id: string) => ['visitor_contents', id] as const,
    // 활성 방문자 공지 수
    activeCount: () => ['visitor_contents', 'count', { is_active: true }] as const,
  },
  companyIntro: {
    config: () => ['company_intro_config'] as const,
  },
  videos: {
    all: ['video_contents'] as const,
    active: () => ['video_contents', { is_active: true }] as const,
    detail: (id: string) => ['video_contents', id] as const,
    // 활성 동영상 수
    activeCount: () => ['video_contents', 'count', { is_active: true }] as const,
  },
  images: {
    all: ['image_contents'] as const,
    active: () => ['image_contents', { is_active: true }] as const,
    detail: (id: string) => ['image_contents', id] as const,
    // 활성 이미지 수
    activeCount: () => ['image_contents', 'count', { is_active: true }] as const,
  },
} as const
