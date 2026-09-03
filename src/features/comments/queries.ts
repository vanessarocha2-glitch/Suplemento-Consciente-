import { createClient } from '@/lib/supabase/server'
import type { SupplementComment } from '@/lib/types'

export type CommentStats = {
  comments: SupplementComment[]
  average: number | null
  count: number
}

/** Comentários de um suplemento, mais recente primeiro, com resumo de nota. */
export async function listComments(supplementId: string): Promise<CommentStats> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplement_comments')
    .select('*')
    .eq('supplement_id', supplementId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao carregar comentários: ${error.message}`)

  const comments = (data ?? []) as SupplementComment[]
  const count = comments.length
  const average =
    count === 0
      ? null
      : Math.round(
          (comments.reduce((sum, comment) => sum + comment.rating, 0) / count) * 10
        ) / 10

  return { comments, average, count }
}

export type AdminComment = SupplementComment & { supplement_name: string }

/** Formato exato devolvido pelo select aninhado abaixo. */
type CommentRow = SupplementComment & { supplement: { name: string } | null }

/** Todos os comentários de todos os suplementos, para o painel de moderação. */
export async function listAllComments(): Promise<AdminComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplement_comments')
    .select('*, supplement:supplements(name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao carregar comentários: ${error.message}`)

  return ((data ?? []) as unknown as CommentRow[]).map((row) => ({
    ...row,
    supplement_name: row.supplement?.name ?? '—',
  }))
}
