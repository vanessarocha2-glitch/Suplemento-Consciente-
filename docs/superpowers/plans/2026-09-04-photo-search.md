# Busca por Foto (OCR de rótulo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o visitante tirar uma foto do rótulo de um suplemento (câmera do celular) e usar o texto lido (via OCR 100% no navegador) como filtro na busca já existente (`?q=`/`?brand=`).

**Architecture:** Novo módulo `src/features/photo-search/` (mesmo formato de `src/features/comments/`): um matcher puro (`match.ts`) que casa texto de OCR contra um índice leve do catálogo, um wrapper de OCR (`ocr.ts`, Tesseract.js carregado sob demanda) e um botão client (`photo-search-button.tsx`) que os une e navega via `router.push`. `search-bar.tsx` e `page.tsx` só ganham uma prop nova (`catalog`) e o botão. Sem API route, sem migração, sem RPC.

**Tech Stack:** Next.js (App Router), React, TypeScript, Vitest + Testing Library, Tesseract.js (import dinâmico, CDN jsdelivr para worker/core), lucide-react, sonner.

**Design spec:** `docs/superpowers/specs/2026-09-04-photo-search-design.md`

---

### Task 1: `match.ts` — matcher puro (normalização, pontuação, fallback)

**Files:**
- Create: `src/features/photo-search/match.ts`
- Test: `src/features/photo-search/match.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```typescript
// src/features/photo-search/match.test.ts
import { describe, it, expect } from 'vitest'
import { buildQueryFromLabel, type CatalogEntry } from './match'

const catalog: CatalogEntry[] = [
  { id: 'c1', name: 'Creatina Monohidratada', category: { id: 'b1', name: 'Growth' } },
  { id: 'c2', name: 'Whey Protein Concentrado', category: { id: 'b2', name: 'Max Titanium' } },
  { id: 'c3', name: 'Colágeno Hidrolisado', category: { id: 'b3', name: 'Dux' } },
]

describe('buildQueryFromLabel', () => {
  it('acha match exato de marca e produto', () => {
    const text = 'GROWTH CREATINA MONOHIDRATADA 250G SUPLEMENTO ALIMENTAR'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Creatina Monohidratada',
      brandId: 'b1',
    })
  })

  it('tolera erro de OCR via similaridade de trigramas', () => {
    const singleItemCatalog: CatalogEntry[] = [
      { id: 'x1', name: 'Creatina', category: { id: 'b1', name: 'Growth' } },
    ]

    expect(buildQueryFromLabel('GROWTH CREATIN', singleItemCatalog)).toEqual({
      q: 'Creatina',
      brandId: 'b1',
    })
  })

  it('cai no fallback de tokens crus quando nada do catálogo bate', () => {
    expect(buildQueryFromLabel('Zqxvkbw Glorfindel Plumbaceous', catalog)).toEqual({
      q: 'Zqxvkbw Glorfindel Plumbaceous',
      brandId: null,
    })
  })

  it('devolve vazio quando o OCR não lê nada', () => {
    expect(buildQueryFromLabel('', catalog)).toEqual({ q: '', brandId: null })
    expect(buildQueryFromLabel('   ', catalog)).toEqual({ q: '', brandId: null })
  })

  it('filtra ruído de rótulo (peso, sabor, "suplemento alimentar" etc.)', () => {
    const text =
      'SUPLEMENTO ALIMENTAR SABOR CHOCOLATE WHEY PROTEIN CONCENTRADO MAX TITANIUM'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Whey Protein Concentrado',
      brandId: 'b2',
    })
  })

  it('ignora acentuação ao comparar com o catálogo', () => {
    const text = 'DUX COLÁGENO HIDROLISADO'

    expect(buildQueryFromLabel(text, catalog)).toEqual({
      q: 'Colágeno Hidrolisado',
      brandId: 'b3',
    })
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `pnpm test src/features/photo-search/match.test.ts`
Expected: FAIL — `Cannot find module './match'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `match.ts`**

```typescript
// src/features/photo-search/match.ts
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

  const fallback = tokens.slice(0, MAX_FALLBACK_TOKENS).map((token) => token.raw)
  return { q: fallback.join(' '), brandId }
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `pnpm test src/features/photo-search/match.test.ts`
Expected: PASS — 6 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/photo-search/match.ts src/features/photo-search/match.test.ts
git commit -m "feat: matcher de busca por foto do rótulo"
```

---

### Task 2: `queries.ts` — índice leve do catálogo

**Files:**
- Create: `src/features/photo-search/queries.ts`

- [ ] **Step 1: Implementar `listCatalogIndex()`**

```typescript
// src/features/photo-search/queries.ts
import { createClient } from '@/lib/supabase/server'
import type { CatalogEntry } from './match'

/** Índice leve (id + nome + marca) usado só para casar o texto do OCR — nenhum dado novo. */
export async function listCatalogIndex(): Promise<CatalogEntry[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplements')
    .select('id, name, category:categories(id, name)')
    .order('name')

  if (error) throw new Error(`Falha ao carregar índice do catálogo: ${error.message}`)

  // Mesma ressalva de searchSupplements() (src/features/supplements/queries.ts):
  // o postgrest-js infere `category` como array por não conhecer a FK N:1
  // supplements -> categories sem geração de tipos do Supabase.
  return (data ?? []) as unknown as CatalogEntry[]
}
```

- [ ] **Step 2: Checar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/features/photo-search/queries.ts
git commit -m "feat: indice leve do catalogo para busca por foto"
```

---

### Task 3: `ocr.ts` — wrapper do Tesseract.js

**Files:**
- Modify: `package.json` (nova dependência)
- Create: `src/features/photo-search/ocr.ts`

- [ ] **Step 1: Adicionar a dependência**

Run: `pnpm add tesseract.js@7.0.0`
Expected: `package.json` e `pnpm-lock.yaml` atualizados com `tesseract.js@7.0.0` (que já fixa `tesseract.js-core@^7.0.0` como dependência transitiva).

- [ ] **Step 2: Implementar `readLabelText()`**

```typescript
// src/features/photo-search/ocr.ts

// Versão pinada — os paths abaixo apontam pro CDN nessa mesma versão,
// evitando que o Next/Turbopack tente empacotar o worker/wasm do Tesseract.
const TESSERACT_VERSION = '7.0.0'

/**
 * Lê o texto de uma foto de rótulo, 100% no navegador (Tesseract.js).
 * Importado dinamicamente para nunca entrar no bundle inicial.
 * Qualquer erro (rede, worker, timeout) propaga — quem decide o fallback
 * é quem chama esta função, não este módulo.
 */
export async function readLabelText(file: File): Promise<string> {
  const { createWorker } = await import('tesseract.js')

  const worker = await createWorker('por+eng', 1, {
    workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
    corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_VERSION}`,
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
  })

  try {
    const { data } = await worker.recognize(file)
    return data.text.trim()
  } finally {
    await worker.terminate()
  }
}
```

Sem teste automatizado aqui (não dá pra rodar Tesseract de forma confiável em CI — ver spec, seção Testes). O componente da Task 4 mocka esta função inteira.

- [ ] **Step 3: Checar tipos**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/photo-search/ocr.ts
git commit -m "feat: leitura de rotulo via tesseract.js (OCR no navegador)"
```

---

### Task 4: `photo-search-button.tsx` — botão de câmera

**Files:**
- Create: `src/features/photo-search/photo-search-button.tsx`
- Test: `src/features/photo-search/photo-search-button.test.tsx`

- [ ] **Step 1: Escrever os testes que falham**

```typescript jsx
// src/features/photo-search/photo-search-button.test.tsx
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { PhotoSearchButton } from './photo-search-button'
import { readLabelText } from './ocr'
import type { CatalogEntry } from './match'

const { push, toastError } = vi.hoisted(() => ({
  push: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('sonner', () => ({
  toast: { error: toastError },
}))

vi.mock('./ocr', () => ({
  readLabelText: vi.fn(),
}))

const catalog: CatalogEntry[] = [
  { id: 'c1', name: 'Creatina Monohidratada', category: { id: 'b1', name: 'Growth' } },
]

function selectPhoto(file: File) {
  const input = screen.getByTestId('photo-search-input')
  fireEvent.change(input, { target: { files: [file] } })
}

describe('PhotoSearchButton', () => {
  beforeEach(() => {
    push.mockReset()
    toastError.mockReset()
    vi.mocked(readLabelText).mockReset()
  })

  it('mostra estado de leitura e navega com o resultado do match', async () => {
    let resolveOcr: (text: string) => void = () => {}
    vi.mocked(readLabelText).mockReturnValue(
      new Promise((resolve) => {
        resolveOcr = resolve
      })
    )

    render(<PhotoSearchButton catalog={catalog} />)

    selectPhoto(new File(['foto'], 'rotulo.jpg', { type: 'image/jpeg' }))

    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).toBeDisabled()

    await act(async () => {
      resolveOcr('GROWTH CREATINA MONOHIDRATADA')
    })

    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/?q=Creatina+Monohidratada&brand=b1')
    )
    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).not.toBeDisabled()
  })

  it('mostra toast de erro e nao navega quando a leitura falha', async () => {
    vi.mocked(readLabelText).mockRejectedValue(new Error('sem internet'))

    render(<PhotoSearchButton catalog={catalog} />)

    selectPhoto(new File(['foto'], 'rotulo.jpg', { type: 'image/jpeg' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Buscar por foto do rótulo' })).not.toBeDisabled()
  })

  it('nao faz nada quando nenhum arquivo e selecionado', () => {
    render(<PhotoSearchButton catalog={catalog} />)

    const input = screen.getByTestId('photo-search-input')
    fireEvent.change(input, { target: { files: [] } })

    expect(readLabelText).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `pnpm test src/features/photo-search/photo-search-button.test.tsx`
Expected: FAIL — `Cannot find module './photo-search-button'` (o arquivo ainda não existe).

- [ ] **Step 3: Implementar `photo-search-button.tsx`**

```typescript jsx
// src/features/photo-search/photo-search-button.tsx
'use client'

import { useRef, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { readLabelText } from './ocr'
import { buildQueryFromLabel, type CatalogEntry } from './match'

export function PhotoSearchButton({ catalog }: { catalog: CatalogEntry[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setReading(true)
    try {
      const text = await readLabelText(file)
      const { q, brandId } = buildQueryFromLabel(text, catalog)
      const params = new URLSearchParams({ q })
      if (brandId) params.set('brand', brandId)
      router.push(`/?${params.toString()}`)
    } catch {
      toast.error('Não foi possível ler a foto. Tente novamente.')
    } finally {
      setReading(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Buscar por foto do rótulo"
        disabled={reading}
        onClick={() => inputRef.current?.click()}
      >
        {reading ? <Loader2 className="animate-spin" /> : <Camera />}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="photo-search-input"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `pnpm test src/features/photo-search/photo-search-button.test.tsx`
Expected: PASS — 3 testes.

- [ ] **Step 5: Commit**

```bash
git add src/features/photo-search/photo-search-button.tsx src/features/photo-search/photo-search-button.test.tsx
git commit -m "feat: botao de busca por foto do rotulo"
```

---

### Task 5: Ligar o botão na busca existente

**Files:**
- Modify: `src/components/search-bar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Adicionar `PhotoSearchButton` ao `SearchBar`**

Em `src/components/search-bar.tsx`, adicionar os imports e o novo prop `catalog`, e renderizar o botão antes do `Input`:

```typescript jsx
'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PhotoSearchButton } from '@/features/photo-search/photo-search-button'
import type { CatalogEntry } from '@/features/photo-search/match'
import type { Category } from '@/lib/types'

export function SearchBar({
  brands,
  catalog,
}: {
  brands: Category[]
  catalog: CatalogEntry[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function submit(formData: FormData) {
    const params = new URLSearchParams()
    const term = String(formData.get('q') ?? '').trim()
    const brand = String(formData.get('brand') ?? '')

    if (term) params.set('q', term)
    if (brand && brand !== 'all') params.set('brand', brand)

    router.push(params.toString() ? `/?${params}` : '/')
  }

  return (
    <form
      action={submit}
      className="flex flex-col gap-2 rounded-[28px] border border-border bg-card p-2 shadow-sm sm:flex-row sm:items-center sm:gap-1"
    >
      <PhotoSearchButton catalog={catalog} />

      <Input
        name="q"
        placeholder="Buscar suplemento pelo nome"
        defaultValue={searchParams.get('q') ?? ''}
        className="h-11 flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0"
      />

      <span className="hidden h-[26px] w-px bg-border sm:block" />

      <Select name="brand" defaultValue={searchParams.get('brand') ?? 'all'}>
        <SelectTrigger className="h-11 border-0 bg-transparent shadow-none sm:w-auto">
          <SelectValue placeholder="Todas as marcas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" className="h-11 px-7">
        Buscar
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Buscar o índice do catálogo em `page.tsx` e passar pro `SearchBar`**

Em `src/app/page.tsx`:

```typescript jsx
import Link from 'next/link'
import { SearchBar } from '@/components/search-bar'
import { SupplementCard } from '@/components/supplement-card'
import { parseSearchParams } from '@/lib/search'
import { searchSupplements } from '@/features/supplements/queries'
import { listBrands } from '@/features/brands/queries'
import { listCatalogIndex } from '@/features/photo-search/queries'

const popularTerms = ['Whey protein', 'Creatina', 'Pré-treino', 'Colágeno']

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filters = parseSearchParams(await searchParams)

  const [supplements, brands, catalog] = await Promise.all([
    searchSupplements(filters),
    listBrands(),
    listCatalogIndex(),
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
        <SearchBar
          key={`${filters.term}:${filters.brandId ?? ''}`}
          brands={brands}
          catalog={catalog}
        />

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
```

- [ ] **Step 3: Rodar a suíte inteira e o typecheck**

Run: `pnpm test`
Expected: PASS — todos os testes (incluindo os de `photo-search/`).

Run: `pnpm exec tsc --noEmit`
Expected: sem erros.

Run: `pnpm lint`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/search-bar.tsx src/app/page.tsx
git commit -m "feat: ligar busca por foto na home"
```

---

### Task 6: QA manual (não automatizado)

Não dá pra testar qualidade real de OCR em CI (ver spec). Depois do deploy (preview ou produção), com o celular:

- [ ] Abrir a home no celular, tocar no ícone de câmera, fotografar um produto **real do catálogo** com boa luz/ângulo — confirmar que o texto lido e os resultados fazem sentido (ideal: acha o produto certo, ou ao menos cai perto o suficiente pra editar).
- [ ] Repetir em condição ruim (ângulo torto, pouca luz) — confirmar que cai no fallback (texto no campo, sem travar).
- [ ] Cancelar a câmera sem tirar foto — confirmar que nada acontece (sem loading preso, sem navegação).
- [ ] Testar com o celular em modo avião (ou wifi desligado) — confirmar o toast de erro e que a página não trava.
- [ ] Conferir visualmente que o ícone de câmera não quebra o layout do pill de busca no mobile (viewport estreito).

---

## Self-review

- **Cobertura da spec:** arquitetura (Task 1-5), fluxo completo até `router.push` (Task 4), OCR com paths de CDN pinados (Task 3), matcher com normalização/pontuação/fallback/marca (Task 1), UI com 3 estados (Task 4), tratamento de erro nunca trava (Task 4, testado), testes de `match.ts` e `photo-search-button.tsx` (Tasks 1 e 4), checklist manual de OCR (Task 6). Nenhuma seção da spec ficou sem task.
- **Sem placeholders:** todo step de código tem o código completo, nenhum "TODO"/"similar ao anterior".
- **Consistência de tipos:** `CatalogEntry` e `PhotoSearchQuery` definidos em `match.ts` (Task 1) são os mesmos tipos usados em `queries.ts` (Task 2), `ocr.ts` não precisa deles, e `photo-search-button.tsx` (Task 4) importa `CatalogEntry` de `./match` — sem duplicação. `buildQueryFromLabel` tem a mesma assinatura em todo lugar que aparece.
