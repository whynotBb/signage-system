import { PageHeader } from '@/components/composite/page-header'
import { UsersTable } from './_components/users-table'

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="사용자 관리"
        description="가입 신청을 승인하고 사용자 역할을 관리합니다."
      />
      <UsersTable />
    </div>
  )
}
