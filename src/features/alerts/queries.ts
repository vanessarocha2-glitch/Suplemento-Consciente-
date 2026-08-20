import { createClient } from '@/lib/supabase/server'
import type { Alert } from '@/lib/types'

export async function listAlerts(): Promise<Alert[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('alerts').select('*').order('title')

  if (error) throw new Error(`Falha ao listar alertas: ${error.message}`)
  return data ?? []
}
