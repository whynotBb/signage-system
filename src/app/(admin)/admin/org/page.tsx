import { PageHeader } from '@/components/composite/page-header'
import { OrgBoard } from './_components/org-board'

// 서버 컴포넌트 — OrgBoard 내부에서 'use client' 처리
export default function OrgPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="조직도 관리"
        description="사이니지에 표시할 조직도를 관리합니다."
      />
      <OrgBoard />
    </div>
  )
}
