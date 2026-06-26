import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/composite/page-header'
import { UsersTable } from './_components/users-table'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'super_admin') redirect('/admin/dashboard')

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
