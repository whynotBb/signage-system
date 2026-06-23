import { PageHeader } from '@/components/composite/page-header'

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="사용자 관리"
        description="시스템 사용자 계정과 권한을 관리합니다."
      />
      {/* TODO: 사용자 관리 기능 구현 */}
    </div>
  )
}
