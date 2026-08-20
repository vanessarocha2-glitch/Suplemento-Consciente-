'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveBrand(formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('categories').update(parsed.data).eq('id', String(id))
    : await supabase.from('categories').insert(parsed.data)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma marca com esse nome' }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  revalidatePath('/')
  return { error: null }
}

export async function deleteBrand(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplements')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam esta marca`,
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/brands')
  revalidatePath('/')
  return { error: null }
}
