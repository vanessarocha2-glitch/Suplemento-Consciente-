'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { alertSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveAlert(formData: FormData): Promise<ActionResult> {
  const parsed = alertSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    severity: formData.get('severity'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('alerts').update(parsed.data).eq('id', String(id))
    : await supabase.from('alerts').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/alerts')
  return { error: null }
}

export async function deleteAlert(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplement_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('alert_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam este alerta`,
    }
  }

  const { error } = await supabase.from('alerts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/alerts')
  return { error: null }
}
