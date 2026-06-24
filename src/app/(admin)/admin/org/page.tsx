import { PageHeader } from '@/components/composite/page-header'
import { DivisionSection } from './_components/division-section'
import { TeamSection } from './_components/team-section'

// 서버 컴포넌트 — 'use client' 없음
export default function OrgPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="조직도 관리"
        description="사이니지에 표시할 조직도를 관리합니다."
      />
      <DivisionSection />
      <TeamSection />
    </div>
  )
}
