import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { AlertBadge } from '@/components/alert-badge'
import { getSupplement } from '@/features/supplements/queries'

const anvisaLabels: Record<string, string> = {
  approved: 'Regularizado na Anvisa',
  pending: 'Em análise na Anvisa',
  not_found: 'Registro não localizado',
}

export default async function SupplementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplement = await getSupplement(id)

  if (!supplement) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 py-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {supplement.category?.name ?? 'Sem marca'}
        </p>
        <h1 className="text-3xl font-semibold">{supplement.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={supplement.anvisa_status === 'approved' ? 'default' : 'secondary'}
          >
            {anvisaLabels[supplement.anvisa_status]}
          </Badge>
          {supplement.anvisa_registration && (
            <span className="text-sm text-muted-foreground">
              Registro {supplement.anvisa_registration}
            </span>
          )}
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Para que serve</h2>
        <p className="text-muted-foreground">{supplement.purpose}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Como usar</h2>
        <p className="text-muted-foreground">{supplement.usage_instructions}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Ingredientes</h2>
        {supplement.ingredients.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum ingrediente cadastrado para este produto.
          </p>
        ) : (
          <ul className="space-y-3">
            {supplement.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="rounded-md border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{ingredient.name}</h3>
                  {ingredient.dosage && (
                    <span className="text-sm text-muted-foreground">
                      {ingredient.dosage}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ingredient.description}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {supplement.alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Alertas de uso</h2>
          <div className="space-y-3">
            {supplement.alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {supplement.legislation_info.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Conformidade legislativa</h2>
          <ul className="space-y-3">
            {supplement.legislation_info.map((claim, index) => (
              <li key={index} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{claim.claim}</p>
                  <Badge variant={claim.compliant ? 'default' : 'destructive'}>
                    {claim.compliant ? 'Conforme' : 'Não conforme'}
                  </Badge>
                </div>
                {claim.note && (
                  <p className="mt-2 text-sm text-muted-foreground">{claim.note}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {supplement.videos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Vídeos sobre este suplemento</h2>
          <ul className="space-y-2">
            {supplement.videos.map((video) => (
              <li key={video.id}>
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {video.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t pt-6 text-sm text-muted-foreground">
        As informações desta página têm caráter educativo e não substituem a
        orientação de um profissional de saúde.
      </p>
    </main>
  )
}
