import { PageHeader } from '@/components/composite/page-header'

export default function VisitorPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="방문자 관리"
        description="방문자 정보를 관리하고 사이니지에 표시합니다."
      />
      {/* TODO: 방문자 관리 기능 구현 */}
    </div>
  )
}
