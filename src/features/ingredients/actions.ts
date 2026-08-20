'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ingredientSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveIngredient(formData: FormData): Promise<ActionResult> {
  const parsed = ingredientSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('ingredients').update(parsed.data).eq('id', String(id))
    : await supabase.from('ingredients').insert(parsed.data)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Já existe um ingrediente com esse nome' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/ingredients')
  return { error: null }
}

export async function deleteIngredient(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplement_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('ingredient_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam este ingrediente`,
    }
  }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/ingredients')
  return { error: null }
}
