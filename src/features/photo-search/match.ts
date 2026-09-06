export type CatalogEntry = {
  id: string
  name: string
  category: { id: string; name: string } | null
}

export type PhotoSearchQuery = {
  q: string
  brandId: string | null
}

const MIN_TOKEN_LENGTH = 3
const MAX_FALLBACK_TOKENS = 3
const MATCH_THRESHOLD = 0.5
const OVERLAP_WEIGHT = 0.6
const TRIGRAM_WEIGHT = 0.4

/** Números soltos ou número+unidade de rótulo ("250G", "12.5ML", "100"). */
const NUMERIC_OR_UNIT = /^\d+(?:[.,]\d+)?(?:G|KG|MG|MCG|ML|L)?$/

/** Palavras de rótulo que não ajudam a identificar o produto. */
const NOISE_WORDS = new Set([
  'SUPLEMENTO',
  'ALIMENTAR',
  'PURE',
  'SABOR',
  'NET',
  'PESO',
  'LIQUIDO',
  'CONTEUDO',
  'INFORMACAO',
  'NUTRICIONAL',
])

/** Letras ASCII + Latin-1 acentuado — evita \p{...} (exige target ES2018+, este projeto usa ES2017). */
const WORD_SPLIT = /[^A-Za-zÀ-ÿ0-9]+/

type Token = { raw: string; normalized: string }

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function tokenize(text: string): Token[] {
  return text
    .trim()
    .split(WORD_SPLIT)
    .filter(Boolean)
    .map((raw) => ({ raw, normalized: stripDiacritics(raw).toUpperCase() }))
}

function isRelevantToken(token: Token): boolean {
  return (
    token.normalized.length >= MIN_TOKEN_LENGTH &&
    !NUMERIC_OR_UNIT.test(token.normalized) &&
    !NOISE_WORDS.has(token.normalized)
  )
}

function buildLabel(text: string): string {
  return tokenize(text)
    .filter(isRelevantToken)
    .map((token) => token.normalized)
    .join(' ')
}

/** Trigramas de caractere, com padding para pesar início/fim da palavra. */
function trigrams(value: string): string[] {
  const padded = `  ${value} `
  const grams: string[] = []
  for (let i = 0; i < padded.length - 2; i++) {
    grams.push(padded.slice(i, i + 3))
  }
  return grams
}

/** Coeficiente de Dice sobre trigramas — tolera erro de OCR (ex: "CREATIN" ≈ "CREATINA"). */
function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1
  const gramsA = trigrams(a)
  const gramsB = trigrams(b)
  if (gramsA.length === 0 || gramsB.length === 0) return 0

  const bag = new Map<string, number>()
  for (const gram of gramsB) bag.set(gram, (bag.get(gram) ?? 0) + 1)

  let matches = 0
  for (const gram of gramsA) {
    const count = bag.get(gram) ?? 0
    if (count > 0) {
      matches++
      bag.set(gram, count - 1)
    }
  }

  return (2 * matches) / (gramsA.length + gramsB.length)
}

function scoreLabel(queryLabel: string, candidateLabel: string): number {
  const queryTokens = queryLabel.split(' ').filter(Boolean)
  const candidateTokens = new Set(candidateLabel.split(' ').filter(Boolean))

  if (queryTokens.length === 0 || candidateTokens.size === 0) return 0

  const overlapCount = queryTokens.filter((token) => candidateTokens.has(token)).length
  const overlapRatio = overlapCount / queryTokens.length
  const trigramScore = diceCoefficient(queryLabel, candidateLabel)

  return OVERLAP_WEIGHT * overlapRatio + TRIGRAM_WEIGHT * trigramScore
}

function itemLabel(entry: CatalogEntry): string {
  return buildLabel(`${entry.category?.name ?? ''} ${entry.name}`)
}

/**
 * Quão perto um único token lido chega de QUALQUER palavra do catálogo
 * (nome de produto ou de marca). Usado só para ordenar o fallback — não
 * decide match (isso é `scoreLabel`, que compara frases inteiras).
 * Recebe os tokens do catálogo já calculados (uma vez por chamada de
 * `buildQueryFromLabel`) em vez de recalcular por token lido.
 */
function tokenCatalogAffinity(token: string, catalogTokens: string[][]): number {
  let best = 0
  for (const candidateTokens of catalogTokens) {
    for (const candidate of candidateTokens) {
      const score = diceCoefficient(token, candidate)
      if (score > best) best = score
    }
  }
  return best
}

/** Mesmo mecanismo de pontuação do item, mas só contra o nome da marca. */
function detectBrandId(queryLabel: string, catalog: CatalogEntry[]): string | null {
  const brandLabels = new Map<string, string>()
  for (const entry of catalog) {
    if (entry.category && !brandLabels.has(entry.category.id)) {
      brandLabels.set(entry.category.id, buildLabel(entry.category.name))
    }
  }

  let best: { id: string; score: number } | null = null
  for (const [id, label] of brandLabels) {
    const score = scoreLabel(queryLabel, label)
    if (!best || score > best.score) best = { id, score }
  }

  return best && best.score >= MATCH_THRESHOLD ? best.id : null
}

export function buildQueryFromLabel(
  text: string,
  catalog: CatalogEntry[]
): PhotoSearchQuery {
  const tokens = tokenize(text).filter(isRelevantToken)
  if (tokens.length === 0) return { q: '', brandId: null }

  const queryLabel = tokens.map((token) => token.normalized).join(' ')
  const brandId = detectBrandId(queryLabel, catalog)

  let best: { entry: CatalogEntry; score: number } | null = null
  for (const entry of catalog) {
    const score = scoreLabel(queryLabel, itemLabel(entry))
    if (!best || score > best.score) best = { entry, score }
  }

  if (best && best.score >= MATCH_THRESHOLD) {
    return { q: best.entry.name, brandId: best.entry.category?.id ?? brandId }
  }

  // Ordena por afinidade com o catálogo (maior primeiro) para escolher QUAIS
  // tokens mostrar, depois restaura a ordem de leitura original para o texto
  // ficar legível — sem isso, o fallback tende a pegar frase de marketing do
  // topo do rótulo em vez de marca/produto, que costumam vir depois.
  const catalogTokens = catalog.map((entry) => itemLabel(entry).split(' ').filter(Boolean))
  const fallback = tokens
    .map((token, index) => ({ token, index, affinity: tokenCatalogAffinity(token.normalized, catalogTokens) }))
    .sort((a, b) => b.affinity - a.affinity || a.index - b.index)
    .slice(0, MAX_FALLBACK_TOKENS)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.token.raw)

  return { q: fallback.join(' '), brandId }
}
