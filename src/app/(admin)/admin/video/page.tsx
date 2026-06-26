import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/composite/page-header'
import { Card } from '@/components/ui/card'

export default function VideoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="동영상 관리"
        description="사이니지에 표시할 동영상 콘텐츠를 관리합니다."
      />
      <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <Construction className="h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="font-semibold">서비스 준비 중</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            이 기능은 현재 개발 중입니다. 곧 제공될 예정입니다.
          </p>
        </div>
      </Card>
    </div>
  )
}
