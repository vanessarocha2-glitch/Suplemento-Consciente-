'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supplementSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

/** Campos JSON e multi-select chegam serializados no FormData. */
function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== 'string' || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveSupplement(formData: FormData): Promise<ActionResult> {
  const parsed = supplementSchema.safeParse({
    name: formData.get('name'),
    category_id: formData.get('category_id'),
    purpose: formData.get('purpose'),
    usage_instructions: formData.get('usage_instructions'),
    anvisa_status: formData.get('anvisa_status'),
    anvisa_registration: formData.get('anvisa_registration'),
    legislation_info: parseJsonField(formData.get('legislation_info'), []),
    image_url: formData.get('image_url'),
    ingredient_ids: parseJsonField<string[]>(formData.get('ingredient_ids'), []),
    alert_ids: parseJsonField<string[]>(formData.get('alert_ids'), []),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { ingredient_ids, alert_ids, ...supplement } = parsed.data
  const supabase = await createClient()
  const rawId = formData.get('id')

  let supplementId: string

  if (rawId) {
    supplementId = String(rawId)
    const { error } = await supabase
      .from('supplements')
      .update(supplement)
      .eq('id', supplementId)

    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase
      .from('supplements')
      .insert(supplement)
      .select('id')
      .single()

    if (error) return { error: error.message }
    supplementId = data.id
  }

  // Junções: apagar e reinserir é mais simples que calcular o diff,
  // e o volume por suplemento é pequeno.
  const { error: clearError } = await Promise.all([
    supabase.from('supplement_ingredients').delete().eq('supplement_id', supplementId),
    supabase.from('supplement_alerts').delete().eq('supplement_id', supplementId),
  ]).then(([ingredients, alerts]) => ({
    error: ingredients.error ?? alerts.error,
  }))

  if (clearError) return { error: clearError.message }

  if (ingredient_ids.length > 0) {
    const { error } = await supabase.from('supplement_ingredients').insert(
      ingredient_ids.map((ingredient_id) => ({
        supplement_id: supplementId,
        ingredient_id,
        dosage: String(formData.get(`dosage_${ingredient_id}`) ?? '') || null,
      }))
    )
    if (error) return { error: error.message }
  }

  if (alert_ids.length > 0) {
    const { error } = await supabase.from('supplement_alerts').insert(
      alert_ids.map((alert_id) => ({ supplement_id: supplementId, alert_id }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/supplements')
  revalidatePath('/')
  revalidatePath(`/supplements/${supplementId}`)
  return { error: null }
}

export async function deleteSupplement(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  // As junções somem por ON DELETE CASCADE; os vídeos ficam com
  // supplement_id null por ON DELETE SET NULL.
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/supplements')
  revalidatePath('/')
  return { error: null }
}
