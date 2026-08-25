'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ranking } from './ranking'
import { submitQuizScore } from './actions'
import { scoreQuiz, performanceMessage, type Answers } from './scoring'
import type { PublicQuizQuestion, QuizQuestion, QuizScore } from '@/lib/types'

type Stage = 'name' | 'answering' | 'result'

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

  const allAnswered = Object.keys(answers).length === questions.length
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
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antes de começar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
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
              {nameError && (
                <p role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <Button onClick={start} className="w-full">
              Começar o quiz
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Melhores pontuações</h2>
          <Ranking scores={ranking} />
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Jogando como <strong>{playerName.trim()}</strong>
      </p>

      {questions.map((question, index) => {
        const detail = result?.details.find((d) => d.questionId === question.id)
        const correctAnswer = answerKey?.[question.id]

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {index + 1}. {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option
                const isCorrect = submitted && option === correctAnswer

                let style = 'border'
                if (submitted && isCorrect) style = 'border-green-600 bg-green-50'
                else if (submitted && selected) style = 'border-red-600 bg-red-50'
                else if (selected) style = 'border-foreground'

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted || pending}
                    onClick={() =>
                      setAnswers({ ...answers, [question.id]: option })
                    }
                    className={`w-full rounded-md p-3 text-left text-sm ${style}`}
                  >
                    {option}
                  </button>
                )
              })}

              {submitted && (
                <p className="pt-2 text-sm text-muted-foreground">
                  {detail?.correct ? 'Correto. ' : 'Resposta correta: '}
                  {!detail?.correct && correctAnswer && (
                    <strong>{correctAnswer}. </strong>
                  )}
                  {question.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {submitted && result ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Você acertou {result.correct} de {result.total} ({result.percentage}%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {performanceMessage(result.percentage)}
              </p>
              <Button onClick={retry}>Refazer o quiz</Button>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-xl font-medium">Melhores pontuações</h2>
            <Ranking scores={ranking} highlightId={scoreId} />
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
                : `Responda todas as perguntas (${Object.keys(answers).length}/${questions.length})`}
          </Button>
        </div>
      )}
    </div>
  )
}
