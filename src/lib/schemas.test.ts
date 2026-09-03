import { describe, it, expect } from 'vitest'
import {
  categorySchema,
  ingredientSchema,
  alertSchema,
  supplementSchema,
  quizQuestionSchema,
  legislationClaimSchema,
  videoSchema,
  commentSchema,
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
    nutrition_table_url: '',
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

  it('converte nutrition_table_url vazia em null', () => {
    const result = supplementSchema.parse(valido)
    expect(result.nutrition_table_url).toBeNull()
  })

  it('mantem a nutrition_table_url quando preenchida', () => {
    const result = supplementSchema.parse({
      ...valido,
      nutrition_table_url: 'https://exemplo.com/tabela.png',
    })
    expect(result.nutrition_table_url).toBe('https://exemplo.com/tabela.png')
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

describe('videoSchema', () => {
  const valido = {
    title: 'Como usar creatina',
    description: 'Vídeo curto sobre dosagem e cuidados.',
    video_url: 'https://youtube.com/watch?v=abc',
    supplement_id: '',
  }

  it('aceita uma URL http(s) valida', () => {
    expect(videoSchema.safeParse(valido).success).toBe(true)
  })

  it('rejeita esquemas perigosos como javascript:', () => {
    const result = videoSchema.safeParse({ ...valido, video_url: 'javascript:alert(1)' })
    expect(result.success).toBe(false)
  })

  it('rejeita esquema data:', () => {
    const result = videoSchema.safeParse({
      ...valido,
      video_url: 'data:text/html,<script>alert(1)</script>',
    })
    expect(result.success).toBe(false)
  })
})

describe('commentSchema', () => {
  const valido = {
    author_name: 'Ana',
    rating: '5',
    comment_text: 'Gostei bastante, senti diferença no treino.',
  }

  it('aceita um comentario valido', () => {
    expect(commentSchema.safeParse(valido).success).toBe(true)
  })

  it('rejeita apelido vazio', () => {
    const result = commentSchema.safeParse({ ...valido, author_name: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita apelido com mais de 40 caracteres', () => {
    const result = commentSchema.safeParse({
      ...valido,
      author_name: 'a'.repeat(41),
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nota zero', () => {
    const result = commentSchema.safeParse({ ...valido, rating: '0' })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'Selecione uma nota de 1 a 5 estrelas'
    )
  })

  it('rejeita nota maior que 5', () => {
    const result = commentSchema.safeParse({ ...valido, rating: '6' })
    expect(result.success).toBe(false)
  })

  it('converte a nota de string para numero', () => {
    const result = commentSchema.parse(valido)
    expect(result.rating).toBe(5)
  })

  it('rejeita comentario vazio', () => {
    const result = commentSchema.safeParse({ ...valido, comment_text: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita comentario com mais de 1000 caracteres', () => {
    const result = commentSchema.safeParse({
      ...valido,
      comment_text: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('remove espacos em volta do apelido e do comentario', () => {
    const result = commentSchema.parse({
      ...valido,
      author_name: '  Ana  ',
      comment_text: '  Gostei  ',
    })
    expect(result.author_name).toBe('Ana')
    expect(result.comment_text).toBe('Gostei')
  })
})
