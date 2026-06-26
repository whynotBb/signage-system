import { DashboardContent } from './_components/dashboard-content'
import { PendingUsersBanner } from '@/components/composite/pending-users-banner'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <PendingUsersBanner />
      <DashboardContent />
    </div>
  )
}
