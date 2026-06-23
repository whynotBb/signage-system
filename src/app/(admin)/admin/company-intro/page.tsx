import { PageHeader } from '@/components/composite/page-header'

export default function CompanyIntroPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="회사소개 관리"
        description="사이니지에 표시할 회사소개 콘텐츠를 관리합니다."
      />
      {/* TODO: 회사소개 관리 기능 구현 */}
    </div>
  )
}
