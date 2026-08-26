import Link from 'next/link'
import { StatusTag } from '@/components/status-tag'
import type { SupplementListItem } from '@/lib/types'

export function SupplementCard({ supplement }: { supplement: SupplementListItem }) {
  return (
    <Link
      href={`/supplements/${supplement.id}`}
      className="group flex h-full flex-col gap-3 rounded-[22px] bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-[var(--color-neutral-200)]">
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

      <div className="flex flex-1 flex-col gap-1 px-0.5">
        <span className="text-[10px] tracking-[0.1em] text-primary uppercase">
          {supplement.category?.name ?? 'Sem marca'}
        </span>
        <span className="font-heading text-lg leading-tight">
          {supplement.name}
        </span>
      </div>

      <div className="px-0.5">
        <StatusTag status={supplement.anvisa_status} />
      </div>

      <div className="flex justify-end px-0.5 pb-0.5 text-sm font-semibold text-[var(--color-accent-700)]">
        <span className="transition-transform group-hover:translate-x-0.5">
          Ver detalhes
        </span>
      </div>
    </Link>
  )
}
