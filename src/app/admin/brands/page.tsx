import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listBrands } from '@/features/brands/queries'
import { saveBrand, deleteBrand } from '@/features/brands/actions'

const fields: FieldDef[] = [
  { name: 'name', label: 'Nome da marca', type: 'text', required: true },
  { name: 'description', label: 'Descrição', type: 'textarea' },
]

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'description', label: 'Descrição' },
]

export default async function BrandsPage() {
  const brands = await listBrands()

  return (
    <CrudManager
      title="Marcas"
      rows={brands}
      fields={fields}
      columns={columns}
      saveAction={saveBrand}
      deleteAction={deleteBrand}
    />
  )
}
