import { describe, it, expect } from 'vitest'
import {
  categorySchema,
  ingredientSchema,
  alertSchema,
  supplementSchema,
  quizQuestionSchema,
  legislationClaimSchema,
} from './schemas'

describe('categorySchema', () => {
  it('aceita uma marca valida', () => {
    const result = categorySchema.safeParse({ name: 'Dux', description: '' })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = categorySchema.safeParse({ name: '', description: '' })
    expect(result.success).toBe(false)
  })

  it('remove espacos em volta do nome', () => {
    const result = categorySchema.parse({ name: '  Max  ', description: '' })
    expect(result.name).toBe('Max')
  })
})

describe('ingredientSchema', () => {
  it('exige descricao', () => {
    const result = ingredientSchema.safeParse({ name: 'Creatina', description: '' })
    expect(result.success).toBe(false)
  })
})

describe('alertSchema', () => {
  it('aceita severidade valida', () => {
    const result = alertSchema.safeParse({
      title: 'Nao recomendado para adolescentes',
      description: 'Consulte um profissional.',
      severity: 'danger',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita severidade desconhecida', () => {
    const result = alertSchema.safeParse({
      title: 'Titulo',
      description: 'Descricao',
      severity: 'critico',
    })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'Selecione uma gravidade válida'
    )
  })
})

describe('supplementSchema', () => {
  const valido = {
    name: 'Whey Protein',
    category_id: '3f1a7c8e-1b2d-4c3e-9f8a-0b1c2d3e4f50',
    purpose: 'Complemento proteico',
    usage_instructions: 'Uma dose ao dia',
    anvisa_status: 'approved',
    anvisa_registration: '6.1234.5678',
    legislation_info: [],
    image_url: '',
    ingredient_ids: [],
    alert_ids: [],
  }

  it('aceita um suplemento valido', () => {
    expect(supplementSchema.safeParse(valido).success).toBe(true)
  })

  it('rejeita category_id que nao e UUID', () => {
    const result = supplementSchema.safeParse({ ...valido, category_id: 'dux' })
    expect(result.success).toBe(false)
  })

  it('rejeita anvisa_status desconhecido', () => {
    const result = supplementSchema.safeParse({ ...valido, anvisa_status: 'inexistente' })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'Selecione uma situação válida'
    )
  })

  it('converte image_url vazia em null', () => {
    const result = supplementSchema.parse(valido)
    expect(result.image_url).toBeNull()
  })

  it('aceita alegacoes de legislacao', () => {
    const result = supplementSchema.parse({
      ...valido,
      legislation_info: [
        { claim: 'Aumenta massa muscular', compliant: false, note: 'RDC 243/2018' },
      ],
    })
    expect(result.legislation_info).toHaveLength(1)
    expect(result.legislation_info[0].compliant).toBe(false)
  })
})

describe('legislationClaimSchema', () => {
  it('rejeita compliant que nao e booleano', () => {
    const result = legislationClaimSchema.safeParse({
      claim: 'Aumenta massa muscular',
      compliant: 'nao',
      note: '',
    })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'Informe se a alegação está de acordo com a legislação'
    )
  })
})

describe('quizQuestionSchema', () => {
  it('rejeita quando a resposta correta nao esta entre as opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Para que serve a creatina?',
      options: ['Forca', 'Sono'],
      correct_answer: 'Digestao',
      explanation: 'A creatina atua na producao de energia.',
      category_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('aceita quando a resposta correta esta entre as opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Para que serve a creatina?',
      options: ['Forca', 'Sono'],
      correct_answer: 'Forca',
      explanation: 'A creatina atua na producao de energia.',
      category_id: '',
    })
    expect(result.success).toBe(true)
  })

  it('exige pelo menos duas opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Pergunta?',
      options: ['Unica'],
      correct_answer: 'Unica',
      explanation: 'Explicacao.',
      category_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('rejeita opcao vazia', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Pergunta?',
      options: ['Forca', '  '],
      correct_answer: 'Forca',
      explanation: 'Explicacao.',
      category_id: '',
    })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'A opção não pode ficar vazia'
    )
  })
})
