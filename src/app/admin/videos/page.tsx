import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listVideos } from '@/features/videos/queries'
import { saveVideo, deleteVideo } from '@/features/videos/actions'
import { listSupplements } from '@/features/supplements/queries'

export default async function AdminVideosPage() {
  const [videos, supplements] = await Promise.all([listVideos(), listSupplements()])

  const fields: FieldDef[] = [
    { name: 'title', label: 'Título', type: 'text', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', required: true },
    { name: 'video_url', label: 'URL do vídeo', type: 'text', required: true },
    {
      name: 'supplement_id',
      label: 'Suplemento relacionado (opcional)',
      type: 'select',
      options: supplements.map((supplement) => ({
        value: supplement.id,
        label: supplement.name,
      })),
    },
  ]

  const columns = [
    { key: 'title', label: 'Título' },
    { key: 'video_url', label: 'URL' },
  ]

  return (
    <CrudManager
      title="Vídeos"
      rows={videos}
      fields={fields}
      columns={columns}
      saveAction={saveVideo}
      deleteAction={deleteVideo}
    />
  )
}
