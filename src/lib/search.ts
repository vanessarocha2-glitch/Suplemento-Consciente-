const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SearchFilters = {
  term: string
  brandId: string | null
}

export type RawSearchParams = Record<string, string | string[] | undefined>

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

/**
 * `%` e `_` são curingas do LIKE. Sem escapar, buscar "100%" traria
 * qualquer nome começando com "100".
 */
function escapeLikeWildcards(term: string): string {
  return term.replace(/[%_\\]/g, (char) => `\\${char}`)
}

export function parseSearchParams(params: RawSearchParams): SearchFilters {
  const term = escapeLikeWildcards(firstValue(params.q).trim())
  const brand = firstValue(params.brand).trim()

  return {
    term,
    brandId: UUID_PATTERN.test(brand) ? brand : null,
  }
}
