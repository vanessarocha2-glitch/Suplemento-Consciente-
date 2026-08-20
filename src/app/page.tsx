import Link from 'next/link'
import { SearchBar } from '@/components/search-bar'
import { SupplementCard } from '@/components/supplement-card'
import { parseSearchParams } from '@/lib/search'
import { searchSupplements } from '@/features/supplements/queries'
import { listBrands } from '@/features/brands/queries'

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
    <main className="mx-auto max-w-5xl space-y-8 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Consulte seu suplemento</h1>
        <p className="text-muted-foreground">
          Veja ingredientes, finalidade, situação na Anvisa e alertas de uso.
        </p>
      </div>

      {/* key força o remount ao navegar por link ("Limpar filtros") ou
          voltar/avançar do navegador, senão o input/select ficam com o
          valor antigo mesmo depois da URL e dos resultados mudarem. */}
      <SearchBar key={`${filters.term}:${filters.brandId ?? ''}`} brands={brands} />

      {supplements.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? 'Nenhum suplemento encontrado com esses filtros.'
              : 'Nenhum suplemento cadastrado ainda.'}
          </p>
          {hasFilters && (
            <Link href="/" className="mt-2 inline-block text-sm underline">
              Limpar filtros
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supplements.map((supplement) => (
            <SupplementCard key={supplement.id} supplement={supplement} />
          ))}
        </div>
      )}
    </main>
  )
}
