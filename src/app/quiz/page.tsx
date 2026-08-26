import Link from 'next/link'
import { listPublicQuizQuestions, listTopScores } from '@/features/quiz/queries'
import { QuizRunner } from '@/features/quiz/quiz-runner'

export default async function QuizPage() {
  const [questions, ranking] = await Promise.all([
    listPublicQuizQuestions(),
    listTopScores(),
  ])

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8 sm:py-12">
        <div>
          <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
            Quiz
          </span>
          <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">Quiz</h1>
          <p className="mt-3 max-w-lg text-lg text-muted-foreground">
            Teste o que você sabe sobre suplementos e entre no ranking.
          </p>
        </div>

        <div className="flex max-w-xl flex-col items-start gap-3 rounded-[28px] bg-card px-8 py-10 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="size-4 rounded-full bg-[var(--color-neutral-300)]" />
            <span className="size-7 rounded-full bg-[var(--color-accent-200)]" />
            <span className="size-11 rounded-full bg-accent-2/40" />
          </div>
          <h3 className="mt-1 text-2xl">O quiz está sendo preparado</h3>
          <p className="text-sm text-muted-foreground">
            Nenhuma pergunta cadastrada ainda. Enquanto isso, os vídeos cobrem
            os mesmos temas.
          </p>
          <Link
            href="/videos"
            className="mt-1 inline-flex h-9 items-center rounded-full bg-primary px-5 font-heading text-sm text-primary-foreground hover:bg-[var(--color-accent-600)]"
          >
            Ver vídeos educativos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
      <QuizRunner questions={questions} initialRanking={ranking} />
    </div>
  )
}
