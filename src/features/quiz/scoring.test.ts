import { describe, it, expect } from 'vitest'
import { scoreQuiz, performanceMessage } from './scoring'
import type { QuizQuestion } from '@/lib/types'

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Para que serve a creatina?',
    options: ['Força', 'Sono'],
    correct_answer: 'Força',
    explanation: 'Atua na produção de energia.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'q2',
    question: 'Suplemento substitui alimentação?',
    options: ['Sim', 'Não'],
    correct_answer: 'Não',
    explanation: 'Suplementos complementam a dieta.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('scoreQuiz', () => {
  it('conta zero acertos quando nada foi respondido', () => {
    const result = scoreQuiz(questions, {})
    expect(result.correct).toBe(0)
    expect(result.total).toBe(2)
    expect(result.percentage).toBe(0)
  })

  it('conta os acertos', () => {
    const result = scoreQuiz(questions, { q1: 'Força', q2: 'Sim' })
    expect(result.correct).toBe(1)
    expect(result.percentage).toBe(50)
  })

  it('marca cem por cento quando tudo esta correto', () => {
    const result = scoreQuiz(questions, { q1: 'Força', q2: 'Não' })
    expect(result.correct).toBe(2)
    expect(result.percentage).toBe(100)
  })

  it('detalha o resultado por pergunta', () => {
    const result = scoreQuiz(questions, { q1: 'Sono', q2: 'Não' })
    expect(result.details).toEqual([
      { questionId: 'q1', answered: 'Sono', correct: false },
      { questionId: 'q2', answered: 'Não', correct: true },
    ])
  })

  it('nao divide por zero quando nao ha perguntas', () => {
    const result = scoreQuiz([], {})
    expect(result.percentage).toBe(0)
    expect(result.total).toBe(0)
  })

  it('arredonda a porcentagem para inteiro', () => {
    const tres = [...questions, { ...questions[0], id: 'q3' }]
    const result = scoreQuiz(tres, { q1: 'Força' })
    expect(result.percentage).toBe(33)
  })
})

describe('performanceMessage', () => {
  it('elogia acima de 80 por cento', () => {
    expect(performanceMessage(100)).toBe('Excelente! Você domina o assunto.')
  })

  it('encoraja entre 50 e 79 por cento', () => {
    expect(performanceMessage(60)).toBe('Bom trabalho! Ainda dá para melhorar.')
  })

  it('orienta abaixo de 50 por cento', () => {
    expect(performanceMessage(20)).toBe(
      'Vale revisar o conteúdo e tentar de novo.'
    )
  })
})
