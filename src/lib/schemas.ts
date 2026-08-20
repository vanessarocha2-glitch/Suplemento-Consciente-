import { z } from 'zod'

/** Campo opcional de texto: string vazia do form vira null no banco. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()

/** UUID opcional: select vazio do form vira null. */
const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.uuid().safeParse(value).success,
    { message: 'Selecione uma opção válida' }
  )

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da marca'),
  description: optionalText,
})

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do ingrediente'),
  description: z.string().trim().min(1, 'Explique para que serve o ingrediente'),
})

export const alertSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título do alerta'),
  description: z.string().trim().min(1, 'Detalhe o alerta'),
  severity: z.enum(['info', 'warning', 'danger'], 'Selecione uma gravidade válida'),
})

export const legislationClaimSchema = z.object({
  claim: z.string().trim().min(1, 'Informe a alegação'),
  compliant: z.boolean('Informe se a alegação está de acordo com a legislação'),
  note: z.string().trim(),
})

export const supplementSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do suplemento'),
  category_id: z.uuid('Selecione uma marca'),
  purpose: z.string().trim().min(1, 'Informe para que serve'),
  usage_instructions: z.string().trim().min(1, 'Informe como usar'),
  anvisa_status: z.enum(['approved', 'pending', 'not_found'], 'Selecione uma situação válida'),
  anvisa_registration: optionalText,
  legislation_info: z.array(legislationClaimSchema).default([]),
  image_url: optionalText,
  ingredient_ids: z.array(z.uuid('Selecione um ingrediente válido')).default([]),
  alert_ids: z.array(z.uuid('Selecione um alerta válido')).default([]),
})

export const videoSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título'),
  description: z.string().trim().min(1, 'Informe a descrição'),
  video_url: z.url('Informe uma URL válida'),
  supplement_id: optionalUuid,
})

export const quizQuestionSchema = z
  .object({
    question: z.string().trim().min(1, 'Informe a pergunta'),
    options: z
      .array(z.string().trim().min(1, 'A opção não pode ficar vazia'))
      .min(2, 'Informe pelo menos duas opções'),
    correct_answer: z.string().trim().min(1, 'Informe a resposta correta'),
    explanation: z.string().trim().min(1, 'Explique a resposta'),
    category_id: optionalUuid,
  })
  .refine((data) => data.options.includes(data.correct_answer), {
    message: 'A resposta correta precisa ser uma das opções',
    path: ['correct_answer'],
  })

export type CategoryInput = z.infer<typeof categorySchema>
export type IngredientInput = z.infer<typeof ingredientSchema>
export type AlertInput = z.infer<typeof alertSchema>
export type SupplementInput = z.infer<typeof supplementSchema>
export type VideoInput = z.infer<typeof videoSchema>
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>
