import { PageHeader } from '@/components/composite/page-header'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description="사이니지 콘텐츠 현황을 한눈에 확인합니다."
      />
      {/* TODO: 콘텐츠 현황 카드 구현 */}
    </div>
  )
}
