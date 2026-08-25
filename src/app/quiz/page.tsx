import { listPublicQuizQuestions, listTopScores } from '@/features/quiz/queries'
import { QuizRunner } from '@/features/quiz/quiz-runner'
import { Ranking } from '@/features/quiz/ranking'

export default async function QuizPage() {
  const [questions, ranking] = await Promise.all([
    listPublicQuizQuestions(),
    listTopScores(),
  ])

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Quiz</h1>
        <p className="text-muted-foreground">
          Teste o que você sabe sobre suplementos e entre no ranking.
        </p>
      </div>

      {questions.length === 0 ? (
        <>
          <p className="text-muted-foreground">
            Nenhuma pergunta cadastrada ainda.
          </p>
          <section className="space-y-3">
            <h2 className="text-xl font-medium">Melhores pontuações</h2>
            <Ranking scores={ranking} />
          </section>
        </>
      ) : (
        <QuizRunner questions={questions} initialRanking={ranking} />
      )}
    </main>
  )
}
