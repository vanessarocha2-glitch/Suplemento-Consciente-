import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listIngredients } from '@/features/ingredients/queries'
import { saveIngredient, deleteIngredient } from '@/features/ingredients/actions'

const fields: FieldDef[] = [
  { name: 'name', label: 'Nome do ingrediente', type: 'text', required: true },
  {
    name: 'description',
    label: 'O que é e para que serve',
    type: 'textarea',
    required: true,
  },
]

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'description', label: 'Descrição' },
]

export default async function IngredientsPage() {
  const ingredients = await listIngredients()

  return (
    <CrudManager
      title="Ingredientes"
      rows={ingredients}
      fields={fields}
      columns={columns}
      saveAction={saveIngredient}
      deleteAction={deleteIngredient}
    />
  )
}
