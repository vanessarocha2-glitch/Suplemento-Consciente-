import { createClient } from '@/lib/supabase/server'
import type { SearchFilters } from '@/lib/search'
import type {
  Alert,
  Category,
  Ingredient,
  Supplement,
  SupplementDetail,
  SupplementListItem,
  Video,
} from '@/lib/types'

/** Formato exato devolvido pelo select aninhado de getSupplement(). */
type SupplementRow = Supplement & {
  category: Category | null
  supplement_ingredients: { dosage: string | null; ingredient: Ingredient }[]
  supplement_alerts: { alert: Alert }[]
  videos: Video[]
}

export async function searchSupplements(
  filters: SearchFilters
): Promise<SupplementListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('supplements')
    .select('id, name, image_url, anvisa_status, category:categories(id, name)')
    .order('name')

  if (filters.term) {
    query = query.ilike('name', `%${filters.term}%`)
  }

  if (filters.brandId) {
    query = query.eq('category_id', filters.brandId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Falha ao buscar suplementos: ${error.message}`)

  // Sem geração de tipos do Supabase, o postgrest-js não sabe que
  // supplements -> categories é N:1 e infere `category` como array.
  // A FK garante um único objeto em runtime — daí o cast.
  return (data ?? []) as unknown as SupplementListItem[]
}

export async function getSupplement(
  id: string
): Promise<SupplementDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplements')
    .select(
      `
      *,
      category:categories(*),
      supplement_ingredients(dosage, ingredient:ingredients(*)),
      supplement_alerts(alert:alerts(*)),
      videos(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Falha ao carregar suplemento: ${error.message}`)
  if (!data) return null

  const row = data as unknown as SupplementRow

  return {
    ...row,
    category: row.category ?? null,
    ingredients: (row.supplement_ingredients ?? []).map((link) => ({
      ...link.ingredient,
      dosage: link.dosage ?? null,
    })),
    alerts: (row.supplement_alerts ?? []).map((link) => link.alert),
    videos: row.videos ?? [],
  }
}

/** Ids de ingredientes e alertas já vinculados — usado para preencher o form. */
export async function getSupplementLinks(id: string) {
  const supabase = await createClient()

  const [ingredients, alerts] = await Promise.all([
    supabase.from('supplement_ingredients').select('ingredient_id').eq('supplement_id', id),
    supabase.from('supplement_alerts').select('alert_id').eq('supplement_id', id),
  ])

  return {
    ingredientIds: (ingredients.data ?? []).map((row) => row.ingredient_id),
    alertIds: (alerts.data ?? []).map((row) => row.alert_id),
  }
}

export async function listSupplements(): Promise<SupplementListItem[]> {
  return searchSupplements({ term: '', brandId: null })
}
