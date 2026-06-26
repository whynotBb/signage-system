import './signage.css'
import { createClient } from '@/lib/supabase/server'
import { SignageDisplay } from '@/components/display/SignageDisplay'

export default async function DisplayPage() {
  const supabase = await createClient()

  const [divsRes, teamsRes, empsRes, configRes] = await Promise.all([
    supabase.from('divisions').select('*').order('display_order', { ascending: true }),
    supabase.from('teams').select('*').order('display_order', { ascending: true }),
    supabase.from('employees').select('*').eq('is_resigned', false).order('display_order', { ascending: true }),
    supabase.from('company_intro_config').select('*').single(),
  ])

  return (
    <SignageDisplay
      divisions={divsRes.data ?? []}
      teams={teamsRes.data ?? []}
      employees={empsRes.data ?? []}
      showSafeInsight={configRes.data?.safeinsight_enabled ?? true}
      showInGuide={configRes.data?.inguide_enabled ?? true}
    />
  )
}
