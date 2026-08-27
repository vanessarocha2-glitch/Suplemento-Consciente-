import Link from 'next/link'
import { StatusTag } from '@/components/status-tag'
import { ImageCarousel, type CarouselImage } from '@/components/image-carousel'
import type { SupplementListItem } from '@/lib/types'

export function SupplementCard({ supplement }: { supplement: SupplementListItem }) {
  // Foto do produto primeiro, tabela nutricional depois.
  const images: CarouselImage[] = []
  if (supplement.image_url) {
    images.push({
      src: supplement.image_url,
      alt: `Foto de ${supplement.name}`,
      fit: 'cover',
    })
  }
  if (supplement.nutrition_table_url) {
    images.push({
      src: supplement.nutrition_table_url,
      alt: `Tabela nutricional de ${supplement.name}`,
      fit: 'contain',
    })
  }

  return (
    <Link
      href={`/supplements/${supplement.id}`}
      className="group flex h-full flex-col gap-3 rounded-[22px] bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden rounded-[16px] bg-[var(--color-neutral-100)]">
        {images.length > 0 ? (
          <ImageCarousel images={images} />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-[10px] text-muted-foreground">sem foto</span>
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
