import type { QuizQuestion } from '@/lib/types'

export type Answers = Record<string, string>

export type QuestionResult = {
  questionId: string
  answered: string | null
  correct: boolean
}

export type QuizResult = {
  correct: number
  total: number
  percentage: number
  details: QuestionResult[]
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Answers
): QuizResult {
  const details: QuestionResult[] = questions.map((question) => {
    const answered = answers[question.id] ?? null
    return {
      questionId: question.id,
      answered,
      correct: answered === question.correct_answer,
    }
  })

  const correct = details.filter((detail) => detail.correct).length
  const total = questions.length

  return {
    correct,
    total,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
    details,
  }
}

export function performanceMessage(percentage: number): string {
  if (percentage >= 80) return 'Excelente! Você domina o assunto.'
  if (percentage >= 50) return 'Bom trabalho! Ainda dá para melhorar.'
  return 'Vale revisar o conteúdo e tentar de novo.'
}
