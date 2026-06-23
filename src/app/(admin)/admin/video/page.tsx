import { PageHeader } from '@/components/composite/page-header'

export default function VideoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="동영상 관리"
        description="사이니지에 표시할 동영상 콘텐츠를 관리합니다."
      />
      {/* TODO: 동영상 관리 기능 구현 */}
    </div>
  )
}
