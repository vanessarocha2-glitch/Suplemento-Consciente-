import { SupplementsManager } from '@/features/supplements/supplements-manager'
import { listSupplements } from '@/features/supplements/queries'
import { saveSupplement, deleteSupplement } from '@/features/supplements/actions'
import { listBrands } from '@/features/brands/queries'
import { listIngredients } from '@/features/ingredients/queries'
import { listAlerts } from '@/features/alerts/queries'

export default async function AdminSupplementsPage() {
  const [supplements, brands, ingredients, alerts] = await Promise.all([
    listSupplements(),
    listBrands(),
    listIngredients(),
    listAlerts(),
  ])

  return (
    <SupplementsManager
      supplements={supplements}
      brands={brands}
      ingredients={ingredients}
      alerts={alerts}
      saveAction={saveSupplement}
      deleteAction={deleteSupplement}
    />
  )
}
