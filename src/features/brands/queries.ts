import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

export async function listBrands(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw new Error(`Falha ao listar marcas: ${error.message}`)
  return data ?? []
}
