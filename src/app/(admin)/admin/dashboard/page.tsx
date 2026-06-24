import { PageHeader } from '@/components/composite/page-header'
import { DashboardStats } from './_components/dashboard-stats'

// 서버 컴포넌트 유지 — DashboardStats 내부에서 'use client' 처리
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description="사이니지 콘텐츠 현황을 한눈에 확인합니다."
      />
      <DashboardStats />
    </div>
  )
}
