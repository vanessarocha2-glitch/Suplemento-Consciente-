# Busca por Foto (OCR de rótulo) — Design Spec

**Goal:** Deixar o visitante tirar uma foto do rótulo de um suplemento (câmera do celular) e usar o texto lido como filtro na busca já existente, sem custo, sem chave de API e sem a foto sair do dispositivo.

**Non-goals:** reconhecimento de imagem "de verdade" (não é comparar a foto com fotos de referência); ranking de similaridade no banco; qualquer alteração de schema/migração.

---

## Contexto

A busca atual (`src/lib/search.ts` + `src/features/supplements/queries.ts`) é: `?q=` (nome, via `ilike`) + `?brand=` (id da categoria), renderizada por `src/app/page.tsx` e preenchida pelo form client `src/components/search-bar.tsx`. O catálogo é pequeno e curado pelo admin.

Decisão de produto (validada com o usuário): **OCR 100% no navegador** (Tesseract.js), não um modelo de visão na nuvem — zero custo permanente, zero chave de API, foto nunca sai do device, em troca de precisão menor que uma IA de visão em nuvem (aceito).

## Arquitetura

Novo módulo `src/features/photo-search/`, no mesmo formato de `src/features/comments/`:

| Arquivo | Papel |
|---|---|
| `queries.ts` | `listCatalogIndex()`: `select id, name, category:categories(id,name)` de `supplements`. Índice leve (id + nome + marca), nenhum dado novo no banco. |
| `ocr.ts` | `readLabelText(file: File): Promise<string>`. Único lugar que toca Tesseract.js. |
| `match.ts` | `buildQueryFromLabel(text: string, catalog: CatalogEntry[]): { q: string; brandId: string \| null }`. Função pura, sem I/O. |
| `match.test.ts` | Testes do matcher. |
| `photo-search-button.tsx` | Client component: ícone de câmera + input de arquivo escondido + estados visuais. |
| `photo-search-button.test.tsx` | Testes do botão (mock de `readLabelText` e `useRouter`). |

Modificados:
- `src/components/search-bar.tsx` — inclui `<PhotoSearchButton catalog={...} />` dentro do pill de busca.
- `src/app/page.tsx` — chama `listCatalogIndex()` junto do `Promise.all` existente e passa pro `SearchBar`.

Sem API route nova, sem migração, sem RPC. O componente só produz uma navegação (`router.push`); a busca em si continua sendo o caminho `?q=`/`?brand=` que já existe hoje.

## Fluxo

```
toca no ícone de câmera
  → <input type="file" accept="image/*" capture="environment"> abre a câmera nativa do celular
  → usuário tira a foto → File
  → readLabelText(file)                 [Tesseract.js, carregado sob demanda, ~3-8s]
  → buildQueryFromLabel(texto, catalog) [função pura, instantâneo]
  → router.push(`/?q=${q}${brandId ? `&brand=${brandId}` : ''}`)
  → page.tsx (server) roda parseSearchParams + searchSupplements normalmente
  → SearchBar remonta (key muda com a nova URL) e mostra o texto no input
```

## OCR (`ocr.ts`)

- `tesseract.js` importado dinamicamente (`await import('tesseract.js')`) só no primeiro uso — nunca no bundle inicial.
- `createWorker('por+eng', 1, { workerPath, corePath, langPath })`, com os três paths apontando para CDN (jsdelivr, versão pinada), evitando bundling do worker/WASM pelo Next/Turbopack.
- Idiomas **português + inglês** juntos: marcas costumam ser em inglês ("Growth", "Whey"), o resto do rótulo em português.
- Download de modelo (~12-15 MB na primeira vez) fica em cache do navegador/IndexedDB nas vezes seguintes (comportamento padrão do Tesseract.js).
- Qualquer erro (rede, worker, timeout) propaga como exceção — quem decide o fallback é o componente, não este módulo.

## Matcher (`match.ts`)

1. **Normalizar**: maiúsculas, sem acento, tokenizar. Descartar números/unidades (`250g`, `%`, `mg`, `ml`, `kg`) e uma lista fixa de ruído de rótulo (`SUPLEMENTO`, `ALIMENTAR`, `PURE`, `100`, `SABOR`, `NET`, `PESO`, `LIQUIDO`, `CONTEUDO`, `INFORMACAO`, `NUTRICIONAL`) e tokens com menos de 3 letras.
2. **Pontuar** cada item do catálogo (`"<marca> <nome>"`) pelos tokens restantes: sobreposição de tokens (peso maior) + similaridade de trigramas de caractere (coeficiente de Dice) como desempate/tolerância a erro de OCR (`"CREATIN"` ≈ `"CREATINA"`).
3. **Detectar marca** separadamente: token que casa forte com um nome de marca do índice vira candidato a `brandId`.
4. **Decisão:**
   - Melhor item acima do limiar → `{ q: item.name, brandId: <marca do item ou detectada> }`
   - Nada acima do limiar mas sobrou texto → `{ q: <até 3 tokens crus>, brandId: <marca detectada ou null> }`
   - OCR não devolveu nada → `{ q: '', brandId: null }`

Limiares e pesos ficam como constantes nomeadas no topo do arquivo, cobertos por teste.

Por que devolver `item.name` (não o texto bruto): a busca existente já lista todos os suplementos com aquele nome — a foto vira efetivamente um filtro, mostrando "as creatinas" com a da marca detectada em destaque via `brandId`.

## UI (`photo-search-button.tsx`)

Ícone `Camera` (lucide-react) dentro do pill do `SearchBar`, antes do `Input`. Três estados:

- **Ocioso**: ícone de câmera, ghost button.
- **Lendo**: ícone vira `Loader2` girando; `Input` fica `disabled` com placeholder "Lendo o rótulo…".
- **Fim**: sempre resolve em `router.push` — o resultado da busca é o próprio feedback.

## Tratamento de erro (nunca trava; tudo cai na "opção A" — texto lido no campo)

| Falha | Comportamento |
|---|---|
| Usuário cancela a câmera (não seleciona arquivo) | Nada acontece, ícone volta ao normal |
| Download do modelo Tesseract falha (sem internet) | Toast de erro (`sonner`) + ícone volta ao normal, sem navegar |
| OCR roda mas não lê nada (foto preta/borrada) | `router.push('/?q=')` — home limpa |
| OCR lê algo mas nada do catálogo bate | `router.push` com os tokens crus — cai no "nada encontrado" já existente, com o texto lido no campo para o usuário editar |

## Testes

- `match.test.ts`: match exato marca+produto, tolerância a erro de OCR via trigrama, texto sem match cai no fallback de tokens crus, texto vazio, ruído de rótulo filtrado, acentuação.
- `photo-search-button.test.tsx`: mocka `readLabelText` e `useRouter` (mesmo padrão de `comment-form.test.tsx`) — estado de loading durante a leitura, URL final montada corretamente, toast no erro de download.
- **Sem teste automatizado da qualidade real do OCR** (não roda Tesseract de forma confiável em CI). Checklist manual: fotografar um produto real do catálogo em boas condições e em condições ruins (ângulo, luz) e conferir o resultado.

## Self-review

- Sem placeholders/TBD — todo módulo tem função e assinatura definida.
- Consistente com o padrão de módulos existente (`features/comments/`, `search-bar.tsx`, `comment-form.test.tsx`).
- Escopo fechado para um plano de implementação único: um módulo novo + duas modificações pontuais, sem migração.
- Ambiguidade retirada: decisão de "o que fazer quando não bate" já resolvida (opção A, texto no campo).
