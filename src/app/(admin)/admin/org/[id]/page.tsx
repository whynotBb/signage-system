import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OrgBoard } from '../_components/org-board'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function OrgChartEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data } = await supabase
    .from('org_charts')
    .select('id, name, is_display_active')
    .eq('id', id)
    .maybeSingle()

  if (!data) notFound()

  return <OrgBoard orgChartId={data.id} orgChartName={data.name} isDisplayActive={data.is_display_active} />
}
