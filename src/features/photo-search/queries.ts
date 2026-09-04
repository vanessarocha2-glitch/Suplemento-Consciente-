import { createClient } from '@/lib/supabase/server'
import type { CatalogEntry } from './match'

/** Índice leve (id + nome + marca) usado só para casar o texto do OCR — nenhum dado novo. */
export async function listCatalogIndex(): Promise<CatalogEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplements')
    .select('id, name, category:categories(id, name)')
    .order('name')

  if (error) throw new Error(`Falha ao carregar índice do catálogo: ${error.message}`)

  // Mesma ressalva de searchSupplements() (src/features/supplements/queries.ts):
  // o postgrest-js infere `category` como array por não conhecer a FK N:1
  // supplements -> categories sem geração de tipos do Supabase.
  return (data ?? []) as unknown as CatalogEntry[]
}
