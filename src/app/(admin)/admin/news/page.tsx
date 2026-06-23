import { PageHeader } from '@/components/composite/page-header'

export default function NewsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="뉴스 관리"
        description="사이니지에 표시할 뉴스 콘텐츠를 관리합니다."
      />
      {/* TODO: 뉴스 관리 기능 구현 */}
    </div>
  )
}
