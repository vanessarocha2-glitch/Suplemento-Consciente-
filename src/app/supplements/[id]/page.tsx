import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusTag } from '@/components/status-tag'
import { AlertBadge } from '@/components/alert-badge'
import { getSupplement } from '@/features/supplements/queries'

export default async function SupplementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplement = await getSupplement(id)

  if (!supplement) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-8 sm:py-12">
      <div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
          Consultar / {supplement.category?.name ?? 'Sem marca'}
        </Link>

        <div className="mt-3 grid gap-8 sm:grid-cols-[1fr_180px] sm:items-start">
          <div>
            <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
              {supplement.category?.name ?? 'Sem marca'}
            </span>
            <h1 className="mt-2 text-4xl tracking-tight">{supplement.name}</h1>
            <StatusTag
              status={supplement.anvisa_status}
              suffix={supplement.anvisa_registration ? `— ${supplement.anvisa_registration}` : undefined}
              className="mt-3"
            />
          </div>
          <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-[var(--color-neutral-200)]">
            {supplement.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={supplement.image_url}
                alt={supplement.name}
                className="size-full object-cover [filter:saturate(0.6)_contrast(0.85)_brightness(1.1)]"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-[repeating-linear-gradient(135deg,var(--color-neutral-200)_0_9px,var(--color-neutral-300)_9px_18px)]">
                <span className="text-[10px] text-[var(--color-neutral-800)]">
                  sem foto
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3.5">
        <div className="rounded-[16px] bg-card p-5">
          <span className="font-heading text-base">Para que serve</span>
          <p className="mt-1.5 text-sm text-muted-foreground">{supplement.purpose}</p>
        </div>

        <div className="rounded-[16px] bg-card p-5">
          <span className="font-heading text-base">Como usar</span>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {supplement.usage_instructions}
          </p>
        </div>

        <div className="rounded-[16px] bg-card p-5">
          <span className="font-heading text-base">Ingredientes</span>
          {supplement.ingredients.length === 0 ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              Nenhum ingrediente cadastrado para este produto.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {supplement.ingredients.map((ingredient) => (
                <li key={ingredient.id} className="rounded-[12px] bg-background p-3.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{ingredient.name}</span>
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
        </div>
      </div>

      {supplement.alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl">Alertas de uso</h2>
          <div className="space-y-3">
            {supplement.alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {supplement.legislation_info.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-2xl">Conformidade legislativa</h2>
          <ul className="space-y-3">
            {supplement.legislation_info.map((claim, index) => (
              <li key={index} className="rounded-[16px] bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{claim.claim}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] ${
                      claim.compliant
                        ? 'bg-[var(--color-accent-2-200)] text-[var(--color-accent-2-800)]'
                        : 'bg-[var(--color-accent-200)] text-[var(--color-accent-800)]'
                    }`}
                  >
                    {claim.compliant ? 'Conforme' : 'Não conforme'}
                  </span>
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
          <h2 className="text-2xl">Vídeos sobre este suplemento</h2>
          <ul className="space-y-2">
            {supplement.videos.map((video) => (
              <li key={video.id}>
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {video.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        As informações desta página têm caráter educativo e não substituem a
        orientação de um profissional de saúde.
      </p>
    </div>
  )
}
