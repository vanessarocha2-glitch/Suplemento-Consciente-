export type AnvisaStatus = 'approved' | 'pending' | 'not_found'
export type AlertSeverity = 'info' | 'warning' | 'danger'

export type LegislationClaim = {
  claim: string
  compliant: boolean
  note: string
}

export type Category = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Ingredient = {
  id: string
  name: string
  description: string
  created_at: string
}

export type Alert = {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  created_at: string
}

export type Supplement = {
  id: string
  name: string
  category_id: string
  purpose: string
  usage_instructions: string
  anvisa_status: AnvisaStatus
  anvisa_registration: string | null
  legislation_info: LegislationClaim[]
  image_url: string | null
  created_at: string
  updated_at: string
}

/** Suplemento na listagem da home — só o necessário para o card. */
export type SupplementListItem = Pick<
  Supplement,
  'id' | 'name' | 'image_url' | 'anvisa_status'
> & {
  category: Pick<Category, 'id' | 'name'> | null
}

/** Suplemento na página de detalhes, com tudo que ele referencia. */
export type SupplementDetail = Supplement & {
  category: Category | null
  ingredients: (Ingredient & { dosage: string | null })[]
  alerts: Alert[]
  videos: Video[]
}

export type Video = {
  id: string
  title: string
  description: string
  video_url: string
  supplement_id: string | null
  created_at: string
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  category_id: string | null
  created_at: string
}

export type QuizScore = {
  id: string
  player_name: string
  correct_count: number
  total_questions: number
  percentage: number
  created_at: string
}

/** Retorno da função submit_quiz_score — a nota vem calculada pelo banco. */
export type SubmittedScore = {
  score_id: string
  correct_count: number
  total_questions: number
  percentage: number
  /** Mapa question_id -> resposta correta, devolvido só depois da nota já estar gravada. */
  answer_key: Record<string, string>
}
