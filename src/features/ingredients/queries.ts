import { createClient } from '@/lib/supabase/server'
import type { Ingredient } from '@/lib/types'

export async function listIngredients(): Promise<Ingredient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name')

  if (error) throw new Error(`Falha ao listar ingredientes: ${error.message}`)
  return data ?? []
}
