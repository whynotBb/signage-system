import { createClient } from './server'

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.getSession()
    return !error
  } catch {
    return false
  }
}
