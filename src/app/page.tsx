import Link from 'next/link'
import { SearchBar } from '@/components/search-bar'
import { SupplementCard } from '@/components/supplement-card'
import { parseSearchParams } from '@/lib/search'
import { searchSupplements } from '@/features/supplements/queries'
import { listBrands } from '@/features/brands/queries'

const popularTerms = ['Whey protein', 'Creatina', 'Pré-treino', 'Colágeno']

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseSearchParams(await searchParams)

  const [supplements, brands] = await Promise.all([
    searchSupplements(filters),
    listBrands(),
  ])

  const hasFilters = filters.term !== '' || filters.brandId !== null

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-8 sm:py-12">
      <div className="grid items-end gap-10 sm:grid-cols-[1fr_auto]">
        <div>
          <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
            Base pública da Anvisa
          </span>
          <h1 className="mt-2 text-4xl tracking-tight sm:text-5xl">
            Consulte seu suplemento
          </h1>
          <p className="mt-3 max-w-lg text-lg text-muted-foreground">
            Veja ingredientes, finalidade, situação na Anvisa e alertas de uso.
          </p>
        </div>
        {/* imagem de apoio: composição de círculos sobrepostos */}
        <div className="relative hidden h-[196px] w-[212px] shrink-0 justify-self-end sm:block">
          <span className="absolute right-0 bottom-0 block size-[196px] rounded-full bg-[var(--color-accent-2-200)]" />
          <span className="absolute right-24 bottom-[104px] block size-[104px] rounded-full bg-[var(--color-accent-200)]" />
          <span className="absolute right-2 bottom-1.5 block size-[132px] rounded-full bg-[var(--color-accent-2-300)]" />
          <span className="absolute right-[120px] bottom-3.5 block size-[46px] rounded-full bg-[var(--color-neutral-300)]" />
        </div>
      </div>

      <div className="space-y-4">
        {/* key força o remount ao navegar por link ("Limpar filtros") ou
            voltar/avançar do navegador, senão o input/select ficam com o
            valor antigo mesmo depois da URL e dos resultados mudarem. */}
        <SearchBar key={`${filters.term}:${filters.brandId ?? ''}`} brands={brands} />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Populares:</span>
          {popularTerms.map((term) => (
            <Link
              key={term}
              href={`/?q=${encodeURIComponent(term)}`}
              className="rounded-full bg-[var(--color-neutral-100)] px-3 py-1 text-xs text-[var(--color-neutral-800)] transition-colors hover:bg-[var(--color-neutral-200)]"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      {supplements.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[28px] bg-card px-8 py-10 shadow-sm sm:max-w-md">
          <div className="size-16 rounded-full bg-accent-2/25" />
          <h3 className="text-2xl">Nada por aqui</h3>
          <p className="text-sm text-muted-foreground">
            {hasFilters
              ? 'Nenhum suplemento encontrado com esses filtros.'
              : 'Nenhum suplemento cadastrado ainda.'}
          </p>
          {hasFilters && (
            <Link
              href="/"
              className="mt-1 inline-flex h-9 items-center rounded-full bg-primary px-5 font-heading text-sm text-primary-foreground hover:bg-[var(--color-accent-600)]"
            >
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h4 className="text-lg">
              {supplements.length}{' '}
              {supplements.length === 1 ? 'suplemento' : 'suplementos'}
            </h4>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {supplements.map((supplement) => (
              <SupplementCard key={supplement.id} supplement={supplement} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
