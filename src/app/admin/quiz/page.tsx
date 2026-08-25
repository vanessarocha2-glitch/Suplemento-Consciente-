import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listQuizQuestions } from '@/features/quiz/queries'
import { saveQuizQuestion, deleteQuizQuestion } from '@/features/quiz/actions'
import { listBrands } from '@/features/brands/queries'

export default async function AdminQuizPage() {
  const [questions, brands] = await Promise.all([listQuizQuestions(), listBrands()])

  // O CrudManager renderiza campos de texto; as opções viram uma linha por item.
  const rows = questions.map((question) => ({
    ...question,
    options: question.options.join('\n'),
  }))

  const fields: FieldDef[] = [
    { name: 'question', label: 'Pergunta', type: 'textarea', required: true },
    {
      name: 'options',
      label: 'Opções (uma por linha)',
      type: 'textarea',
      required: true,
    },
    { name: 'correct_answer', label: 'Resposta correta', type: 'text', required: true },
    { name: 'explanation', label: 'Explicação', type: 'textarea', required: true },
    {
      name: 'category_id',
      label: 'Marca relacionada (opcional)',
      type: 'select',
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
  ]

  const columns = [
    { key: 'question', label: 'Pergunta' },
    { key: 'correct_answer', label: 'Resposta correta' },
  ]

  return (
    <CrudManager
      title="Perguntas do quiz"
      rows={rows}
      fields={fields}
      columns={columns}
      saveAction={saveQuizQuestion}
      deleteAction={deleteQuizQuestion}
    />
  )
}
