'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Ranking } from './ranking'
import { submitQuizScore } from './actions'
import { scoreQuiz, performanceMessage, type Answers } from './scoring'
import type { PublicQuizQuestion, QuizQuestion, QuizScore } from '@/lib/types'

type Stage = 'name' | 'answering' | 'result'

const steps = [
  {
    label: '1',
    bg: 'bg-[var(--color-accent-200)]',
    fg: 'text-[var(--color-accent-800)]',
    title: 'Responda',
    body: 'Perguntas de múltipla escolha sobre uso e cuidados.',
  },
  {
    label: '2',
    bg: 'bg-[var(--color-accent-2-200)]',
    fg: 'text-[var(--color-accent-2-800)]',
    title: 'Aprenda',
    body: 'Cada resposta vem com a explicação certa.',
  },
  {
    label: '3',
    bg: 'bg-[var(--color-neutral-200)]',
    fg: 'text-[var(--color-neutral-800)]',
    title: 'Entre no ranking',
    body: 'Sua pontuação aparece nas melhores do mês.',
  },
]

export function QuizRunner({
  questions,
  initialRanking,
}: {
  questions: PublicQuizQuestion[]
  initialRanking: QuizScore[]
}) {
  const [stage, setStage] = useState<Stage>('name')
  const [playerName, setPlayerName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [ranking, setRanking] = useState(initialRanking)
  const [scoreId, setScoreId] = useState<string | undefined>()
  const [answerKey, setAnswerKey] = useState<Record<string, string> | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === questions.length
  const submitted = stage === 'result' && answerKey !== null

  // O gabarito só existe depois que o servidor devolve a nota — nunca antes.
  // Até aqui, `correct_answer` nem chegou ao cliente (ver public_quiz_questions()).
  const result = answerKey
    ? scoreQuiz(
        questions.map((q) => ({
          ...q,
          correct_answer: answerKey[q.id] ?? '',
        })) as QuizQuestion[],
        answers
      )
    : null

  function start() {
    const name = playerName.trim()
    if (name.length < 1 || name.length > 40) {
      setNameError('Informe um nome de 1 a 40 caracteres')
      return
    }
    setNameError(null)
    setStage('answering')
  }

  function submit() {
    setSubmitError(null)
    startTransition(async () => {
      const response = await submitQuizScore(playerName, answers)

      if (response.ok) {
        setRanking(response.ranking)
        setScoreId(response.score.score_id)
        setAnswerKey(response.score.answer_key)
        setStage('result')
      } else {
        // Sem o gabarito do servidor não há como calcular a nota localmente
        // — mantém as respostas e deixa tentar de novo, em vez de mostrar
        // um resultado quebrado.
        setSubmitError(response.error)
      }
    })
  }

  function retry() {
    setAnswers({})
    setScoreId(undefined)
    setAnswerKey(null)
    setSubmitError(null)
    setStage('answering')
  }

  if (stage === 'name') {
    return (
      <div className="grid gap-10 lg:grid-cols-[1fr_360px] lg:items-start">
        <div>
          <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
            {questions.length} perguntas
          </span>
          <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">Quiz</h1>
          <p className="mt-3 max-w-md text-lg text-muted-foreground">
            Teste o que você sabe sobre suplementos e entre no ranking.
          </p>

          <div className="mt-6 flex max-w-sm flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="player-name">
                Como você quer aparecer no ranking?
              </Label>
              <Input
                id="player-name"
                value={playerName}
                maxLength={40}
                placeholder="Seu nome ou apelido"
                onChange={(event) => setPlayerName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && start()}
              />
            </div>
            <Button onClick={start} className="h-9 px-6">
              Começar o quiz
            </Button>
          </div>
          {nameError && (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {nameError}
            </p>
          )}

          <div className="mt-11 flex flex-wrap gap-8">
            {steps.map((step) => (
              <div key={step.label} className="flex max-w-[180px] flex-col gap-2">
                <span
                  className={`flex size-11 items-center justify-center rounded-full font-heading ${step.bg} ${step.fg}`}
                >
                  {step.label}
                </span>
                <span className="font-heading text-sm">{step.title}</span>
                <p className="text-sm text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[22px] bg-card p-6 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-lg">Melhores pontuações</span>
          </div>
          <div className="mt-3">
            <Ranking scores={ranking} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Jogando como <strong className="text-foreground">{playerName.trim()}</strong>
        </p>
        {!submitted && (
          <span className="rounded-full bg-[var(--color-accent-2-100)] px-3 py-1 text-xs text-[var(--color-accent-2-800)]">
            {answeredCount} de {questions.length} respondidas
          </span>
        )}
      </div>

      {!submitted && (
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-neutral-200)]">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      )}

      {questions.map((question, index) => {
        const detail = result?.details.find((d) => d.questionId === question.id)
        const correctAnswer = answerKey?.[question.id]

        return (
          <div key={question.id} className="rounded-[20px] bg-card p-6">
            <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
              Pergunta {index + 1} de {questions.length}
            </span>
            <h3 className="mt-2 mb-4 text-2xl text-balance">{question.question}</h3>
            <div className="flex flex-col gap-2.5">
              {question.options.map((option) => {
                const selected = answers[question.id] === option
                const isCorrect = submitted && option === correctAnswer

                let style = 'border border-[var(--color-divider)] bg-background'
                if (submitted && isCorrect) style = 'border-green-600 bg-green-50'
                else if (submitted && selected) style = 'border-red-600 bg-red-50'
                else if (selected)
                  style = 'border-foreground bg-[var(--color-accent-100)] border'

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted || pending}
                    onClick={() =>
                      setAnswers({ ...answers, [question.id]: option })
                    }
                    className={`w-full rounded-full p-3.5 px-5 text-left text-sm transition-colors disabled:cursor-default ${style}`}
                  >
                    {option}
                  </button>
                )
              })}
            </div>

            {submitted && (
              <p className="mt-3 text-sm text-muted-foreground">
                {detail?.correct ? 'Correto. ' : 'Resposta correta: '}
                {!detail?.correct && correctAnswer && (
                  <strong className="text-foreground">{correctAnswer}. </strong>
                )}
                {question.explanation}
              </p>
            )}
          </div>
        )
      })}

      {submitted && result ? (
        <>
          <div className="flex flex-col items-start gap-4 rounded-[22px] bg-card p-7 sm:flex-row sm:items-center">
            <div className="flex size-24 shrink-0 flex-col items-center justify-center rounded-full bg-[var(--color-accent-200)]">
              <span className="font-heading text-3xl leading-none text-[var(--color-accent-800)]">
                {result.correct}
              </span>
              <span className="text-xs text-[var(--color-accent-800)]">
                de {result.total}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl">
                Você acertou {result.correct} de {result.total} ({result.percentage}%)
              </h3>
              <p className="mt-1 text-muted-foreground">
                {performanceMessage(result.percentage)}
              </p>
            </div>
            <Button onClick={retry} variant="secondary" className="shrink-0">
              Refazer o quiz
            </Button>
          </div>

          <section className="space-y-3">
            <h2 className="text-2xl">Melhores pontuações</h2>
            <div className="rounded-[22px] bg-card p-6">
              <Ranking scores={ranking} highlightId={scoreId} />
            </div>
            {scoreId && !ranking.some((score) => score.id === scoreId) && (
              <p className="text-sm text-muted-foreground">
                Sua pontuação foi registrada, mas ainda não entrou no top 10.
              </p>
            )}
          </section>
        </>
      ) : (
        <div className="space-y-2">
          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível calcular seu resultado: {submitError}. Tente
              enviar de novo.
            </p>
          )}
          <Button
            className="w-full"
            disabled={!allAnswered || pending}
            onClick={submit}
          >
            {pending
              ? 'Enviando...'
              : allAnswered
                ? 'Ver resultado'
                : `Responda todas as perguntas (${answeredCount}/${questions.length})`}
          </Button>
        </div>
      )}
    </div>
  )
}
