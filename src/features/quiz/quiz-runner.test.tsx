import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QuizRunner } from './quiz-runner'
import { submitQuizScore } from './actions'
import type { PublicQuizQuestion } from '@/lib/types'

vi.mock('./actions', () => ({
  submitQuizScore: vi.fn(),
}))

const questions: PublicQuizQuestion[] = [
  {
    id: 'q1',
    question: 'Para que serve a creatina?',
    options: ['Força', 'Sono'],
    explanation: 'Atua na produção de energia.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'q2',
    question: 'Suplemento substitui alimentação?',
    options: ['Sim', 'Não'],
    explanation: 'Suplementos complementam a dieta.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]

/** Entra no quiz e responde todas as perguntas (sempre a primeira opção). */
function startAndAnswer() {
  render(<QuizRunner questions={questions} initialRanking={[]} />)

  fireEvent.change(screen.getByLabelText('Como você quer aparecer no ranking?'), {
    target: { value: 'Testador' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Começar o quiz' }))

  // Responde a primeira opção de cada pergunta: 'Força' (correta) e 'Sim' (errada).
  fireEvent.click(screen.getByRole('button', { name: 'Força' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sim' }))
}

describe('QuizRunner', () => {
  beforeEach(() => {
    vi.mocked(submitQuizScore).mockReset()
  })

  it('nunca expõe o gabarito antes do envio', () => {
    startAndAnswer()

    // As perguntas nunca chegaram com correct_answer (tipo PublicQuizQuestion),
    // e nenhum texto de gabarito deve aparecer antes do envio.
    expect(screen.queryByText(/Resposta correta:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Correto\./)).not.toBeInTheDocument()

    // Nenhuma opção deve estar com a classe de acerto/erro antes do envio.
    for (const label of ['Força', 'Sono', 'Sim', 'Não']) {
      const button = screen.getByRole('button', { name: label })
      expect(button.className).not.toMatch(/border-green-600|border-red-600/)
    }

    // O botão de envio deve estar habilitado (todas respondidas) mas o
    // resultado ainda não foi calculado/exibido.
    expect(
      screen.queryByText(/Você acertou/)
    ).not.toBeInTheDocument()
  })

  it('revela o gabarito só depois de um envio bem-sucedido', async () => {
    vi.mocked(submitQuizScore).mockResolvedValue({
      ok: true,
      score: {
        score_id: 'score-1',
        correct_count: 1,
        total_questions: 2,
        percentage: 50,
        answer_key: { q1: 'Força', q2: 'Não' },
      },
      ranking: [
        {
          id: 'score-1',
          player_name: 'Testador',
          correct_count: 1,
          total_questions: 2,
          percentage: 50,
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
    })

    startAndAnswer()
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultado' }))

    // Espera a UI assíncrona resolver.
    expect(await screen.findByText(/Você acertou 1 de 2/)).toBeInTheDocument()

    // q1: respondeu 'Força' e a correta é 'Força' -> correto.
    const forcaButton = screen.getByRole('button', { name: 'Força' })
    expect(forcaButton.className).toMatch(/border-green-600/)

    // q2: respondeu 'Sim', mas a correta é 'Não' -> deve revelar 'Não' como
    // correta (verde) e 'Sim' como errada (vermelha), e mostrar o texto do gabarito.
    const naoButton = screen.getByRole('button', { name: 'Não' })
    const simButton = screen.getByRole('button', { name: 'Sim' })
    expect(naoButton.className).toMatch(/border-green-600/)
    expect(simButton.className).toMatch(/border-red-600/)
    const explanation = screen.getByText(/Resposta correta:/)
    expect(explanation).toBeInTheDocument()
    expect(explanation.textContent).toContain('Não.')

    // Ranking atualizado e pontuação destacada (aparece 2x: no cabeçalho
    // "Jogando como" e na linha da tabela de ranking).
    expect(screen.getAllByText('Testador')).toHaveLength(2)
  })

  it('mantém as respostas e mostra erro quando o envio falha', async () => {
    vi.mocked(submitQuizScore).mockResolvedValue({
      ok: false,
      error: 'Falha de rede',
    })

    startAndAnswer()
    fireEvent.click(screen.getByRole('button', { name: 'Ver resultado' }))

    // Aguarda o estado de erro aparecer.
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Não foi possível calcular seu resultado')
    expect(alert).toHaveTextContent('Falha de rede')

    // Continua na tela de resposta (não foi para o resultado quebrado).
    expect(screen.queryByText(/Você acertou/)).not.toBeInTheDocument()

    // As respostas foram preservadas, ainda sem estilo de acerto/erro.
    const forcaButton = screen.getByRole('button', { name: 'Força' })
    const simButton = screen.getByRole('button', { name: 'Sim' })
    expect(forcaButton.className).toMatch(/border-foreground/)
    expect(simButton.className).toMatch(/border-foreground/)
    expect(forcaButton.className).not.toMatch(/border-green-600|border-red-600/)
    expect(simButton.className).not.toMatch(/border-green-600|border-red-600/)

    // O botão de envio continua disponível para tentar de novo.
    expect(
      screen.getByRole('button', { name: 'Ver resultado' })
    ).toBeEnabled()
  })
})
