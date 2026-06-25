import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function AdminIndexPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect('/admin/dashboard')
  } else {
    redirect('/admin/login')
  }
}
