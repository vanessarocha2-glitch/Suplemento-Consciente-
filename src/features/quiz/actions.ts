'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { quizQuestionSchema } from '@/lib/schemas'
import { listTopScores } from './queries'
import type { ActionResult } from '@/components/crud-manager'
import type { QuizScore, SubmittedScore } from '@/lib/types'

/** O form envia as opções como uma linha por opção. */
function parseOptions(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((option) => option.trim())
    .filter((option) => option !== '')
}

export async function saveQuizQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = quizQuestionSchema.safeParse({
    question: formData.get('question'),
    options: parseOptions(formData.get('options')),
    correct_answer: formData.get('correct_answer'),
    explanation: formData.get('explanation'),
    category_id: formData.get('category_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('quiz_questions').update(parsed.data).eq('id', String(id))
    : await supabase.from('quiz_questions').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/quiz')
  revalidatePath('/quiz')
  return { error: null }
}

export async function deleteQuizQuestion(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/quiz')
  revalidatePath('/quiz')
  return { error: null }
}

export type SubmitScoreResult =
  | { ok: true; score: SubmittedScore; ranking: QuizScore[] }
  | { ok: false; error: string }

/**
 * Recebe as respostas do visitante e delega o cálculo ao banco.
 * A nota nunca vem do cliente — ver submit_quiz_score em 0003_quiz_scores.sql.
 * O gabarito (score.answer_key) só existe na resposta desta chamada, depois
 * que a nota já foi calculada e gravada — nunca antes disso.
 */
export async function submitQuizScore(
  playerName: string,
  answers: Record<string, string>
): Promise<SubmitScoreResult> {
  const name = playerName.trim()

  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: 'Informe um nome de 1 a 40 caracteres' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('submit_quiz_score', { p_player_name: name, p_answers: answers })
    .single()

  if (error) return { ok: false, error: error.message }

  const ranking = await listTopScores()

  revalidatePath('/quiz')
  return { ok: true, score: data as SubmittedScore, ranking }
}
