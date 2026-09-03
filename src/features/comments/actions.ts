'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { commentSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

/**
 * Recebe a avaliação de um visitante. Sem sessão/cookie de usuário, então
 * não há limite de um comentário por pessoa — a moderação do admin
 * (deleteComment) é a rede de segurança contra spam/abuso.
 */
export async function submitComment(
  supplementId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse({
    author_name: formData.get('author_name'),
    rating: formData.get('rating'),
    comment_text: formData.get('comment_text'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('supplement_comments').insert({
    supplement_id: supplementId,
    ...parsed.data,
  })

  if (error) return { error: error.message }

  revalidatePath(`/supplements/${supplementId}`)
  return { error: null }
}

export async function deleteComment(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('supplement_comments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/comments')
  revalidatePath('/supplements/[id]', 'page')
  return { error: null }
}
