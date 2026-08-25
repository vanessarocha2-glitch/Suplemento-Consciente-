import { createClient } from '@/lib/supabase/server'
import type { PublicQuizQuestion, QuizQuestion, QuizScore } from '@/lib/types'

/** Lista completa, com o gabarito — usada só pelo admin autenticado. */
export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .order('created_at')

  if (error) throw new Error(`Falha ao listar perguntas: ${error.message}`)
  return (data ?? []) as QuizQuestion[]
}

/**
 * Lista pública, sem o gabarito — usada pela página /quiz. Passa pela
 * função public_quiz_questions() porque quiz_questions não tem política
 * de leitura pública (ver amendment na Task 5/22 do plano).
 */
export async function listPublicQuizQuestions(): Promise<PublicQuizQuestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('public_quiz_questions')

  if (error) throw new Error(`Falha ao carregar perguntas: ${error.message}`)
  return (data ?? []) as PublicQuizQuestion[]
}

/** Os 10 melhores resultados. A ordem é a mesma do índice quiz_scores_ranking_idx. */
export async function listTopScores(): Promise<QuizScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_scores')
    .select('*')
    .order('percentage', { ascending: false })
    .order('correct_count', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) throw new Error(`Falha ao carregar o ranking: ${error.message}`)
  return data ?? []
}
