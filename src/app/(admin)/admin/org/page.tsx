import { PageHeader } from '@/components/composite/page-header'

export default function OrgPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="조직도 관리"
        description="사이니지에 표시할 조직도를 관리합니다."
      />
      {/* TODO: 조직도 관리 기능 구현 */}
    </div>
  )
}
