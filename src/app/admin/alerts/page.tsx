import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listAlerts } from '@/features/alerts/queries'
import { saveAlert, deleteAlert } from '@/features/alerts/actions'

const fields: FieldDef[] = [
  { name: 'title', label: 'Título do alerta', type: 'text', required: true },
  { name: 'description', label: 'Detalhamento', type: 'textarea', required: true },
  {
    name: 'severity',
    label: 'Gravidade',
    type: 'select',
    options: [
      { value: 'info', label: 'Informativo' },
      { value: 'warning', label: 'Atenção' },
      { value: 'danger', label: 'Grave' },
    ],
  },
]

const columns = [
  { key: 'title', label: 'Título' },
  { key: 'severity', label: 'Gravidade' },
]

export default async function AlertsPage() {
  const alerts = await listAlerts()

  return (
    <CrudManager
      title="Alertas"
      rows={alerts}
      fields={fields}
      columns={columns}
      saveAction={saveAlert}
      deleteAction={deleteAlert}
    />
  )
}
