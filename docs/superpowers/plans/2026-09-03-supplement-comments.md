# Comentários e Avaliação de Suplementos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any visitor (no login) rate a supplement 1-5 stars and leave a written comment, visible on the supplement's detail page, with an admin moderation screen to delete inappropriate ones.

**Architecture:** New `supplement_comments` table with public-read + public-insert (constrained by CHECK constraints) RLS policies, mirroring the existing `categories`/`alerts`/`videos` pattern rather than the quiz's `security definer` RPC (there's no secret computation to hide here). New `src/features/comments/` module (queries + actions + two components) follows the same shape as `src/features/quiz/`. The supplement detail page is restructured into two tabs ("Informações" / "Comentários") using a new `components/ui/tabs.tsx` primitive. A read-only admin page lists all comments with a delete action.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase (Postgres + RLS), Zod, Vitest + Testing Library, Tailwind CSS v4, radix-ui, lucide-react.

---

## Reference: spec

Full design and rationale: `docs/superpowers/specs/2026-09-03-supplement-comments-design.md`. Read it before starting if anything below is unclear.

## File Structure

- Create: `supabase/migrations/0005_supplement_comments.sql` — table + RLS
- Modify: `src/lib/types.ts` — add `SupplementComment` type
- Modify: `src/lib/schemas.ts` — add `commentSchema`
- Modify: `src/lib/schemas.test.ts` — add `commentSchema` tests
- Create: `src/features/comments/queries.ts` — `listComments`, `listAllComments`
- Create: `src/features/comments/actions.ts` — `submitComment`, `deleteComment`
- Create: `src/features/comments/comment-list.tsx` — presentational summary + list
- Create: `src/features/comments/comment-form.tsx` — client form (name, stars, text)
- Create: `src/features/comments/comment-form.test.tsx` — form behavior tests
- Create: `src/components/ui/tabs.tsx` — Tabs primitive (radix-ui, project's New York + Organic styling)
- Modify: `src/app/supplements/[id]/page.tsx` — wrap in tabs, add Comentários tab
- Create: `src/app/admin/comments/page.tsx` — fetches comments, renders the table
- Create: `src/app/admin/comments/comments-table.tsx` — moderation table (list + delete)
- Modify: `src/components/admin-sidebar.tsx` — add "Comentários" nav item

---

### Task 0: Create a feature branch

**Files:** none

- [x] **Step 1: Create and switch to a feature branch**

Run: `git checkout -b feature/supplement-comments`
Expected: `Switched to a new branch 'feature/supplement-comments'`

This repo belongs to another GitHub account (`vanessarocha2-glitch`); work happens on a branch, not directly on `main`, so it can land via PR.

---

### Task 1: Database migration

**Files:**
- Create: `supabase/migrations/0005_supplement_comments.sql`

- [x] **Step 1: Write the migration**

```sql
-- Avaliação (1-5 estrelas) e comentário escrito por visitante, sem conta.
-- Diferente de quiz_scores, não há nada a esconder do cliente (não existe
-- gabarito/cálculo sigiloso) — por isso a escrita usa uma política de INSERT
-- direta, no mesmo espírito da "leitura publica" já usada em categories,
-- alerts, videos etc., em vez de uma função security definer.
create table supplement_comments (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references supplements(id) on delete cascade,
  author_name text not null
    check (char_length(trim(author_name)) between 1 and 40),
  rating int not null check (rating between 1 and 5),
  comment_text text not null
    check (char_length(trim(comment_text)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index supplement_comments_supplement_id_idx
  on supplement_comments (supplement_id, created_at desc);

alter table supplement_comments enable row level security;

create policy "leitura publica" on supplement_comments
  for select using (true);

create policy "escrita publica" on supplement_comments
  for insert to anon, authenticated
  with check (rating between 1 and 5);

create policy "escrita admin" on supplement_comments
  for delete to authenticated using (true);
```

- [x] **Step 2: Commit**

```bash
git add supabase/migrations/0005_supplement_comments.sql
git commit -m "feat: adicionar tabela de comentarios e avaliacao de suplementos"
```

---

### Task 2: `SupplementComment` type

**Files:**
- Modify: `src/lib/types.ts`

- [x] **Step 1: Add the type**

Add at the end of `src/lib/types.ts`:

```ts
export type SupplementComment = {
  id: string
  supplement_id: string
  author_name: string
  rating: number
  comment_text: string
  created_at: string
}
```

- [x] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: adicionar tipo SupplementComment"
```

---

### Task 3: `commentSchema` (TDD)

**Files:**
- Modify: `src/lib/schemas.ts`
- Test: `src/lib/schemas.test.ts`

- [x] **Step 1: Write the failing tests**

Add to `src/lib/schemas.test.ts`, alongside the other imports at the top add `commentSchema`:

```ts
import {
  categorySchema,
  ingredientSchema,
  alertSchema,
  supplementSchema,
  quizQuestionSchema,
  legislationClaimSchema,
  videoSchema,
  commentSchema,
} from './schemas'
```

Then append this block at the end of the file:

```ts
describe('commentSchema', () => {
  const valido = {
    author_name: 'Ana',
    rating: '5',
    comment_text: 'Gostei bastante, senti diferença no treino.',
  }

  it('aceita um comentario valido', () => {
    expect(commentSchema.safeParse(valido).success).toBe(true)
  })

  it('rejeita apelido vazio', () => {
    const result = commentSchema.safeParse({ ...valido, author_name: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita apelido com mais de 40 caracteres', () => {
    const result = commentSchema.safeParse({
      ...valido,
      author_name: 'a'.repeat(41),
    })
    expect(result.success).toBe(false)
  })

  it('rejeita nota zero', () => {
    const result = commentSchema.safeParse({ ...valido, rating: '0' })
    expect(result.success).toBe(false)
    expect(result.success ? undefined : result.error.issues[0].message).toBe(
      'Selecione uma nota de 1 a 5 estrelas'
    )
  })

  it('rejeita nota maior que 5', () => {
    const result = commentSchema.safeParse({ ...valido, rating: '6' })
    expect(result.success).toBe(false)
  })

  it('converte a nota de string para numero', () => {
    const result = commentSchema.parse(valido)
    expect(result.rating).toBe(5)
  })

  it('rejeita comentario vazio', () => {
    const result = commentSchema.safeParse({ ...valido, comment_text: '  ' })
    expect(result.success).toBe(false)
  })

  it('rejeita comentario com mais de 1000 caracteres', () => {
    const result = commentSchema.safeParse({
      ...valido,
      comment_text: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('remove espacos em volta do apelido e do comentario', () => {
    const result = commentSchema.parse({
      ...valido,
      author_name: '  Ana  ',
      comment_text: '  Gostei  ',
    })
    expect(result.author_name).toBe('Ana')
    expect(result.comment_text).toBe('Gostei')
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/lib/schemas.test.ts`
Expected: FAIL — `commentSchema` is not exported from `./schemas`.

- [x] **Step 3: Implement `commentSchema`**

Add to `src/lib/schemas.ts`, after `quizQuestionSchema`:

```ts
export const commentSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, 'Informe seu apelido')
    .max(40, 'Apelido muito longo'),
  rating: z.coerce
    .number()
    .int()
    .min(1, 'Selecione uma nota de 1 a 5 estrelas')
    .max(5, 'Selecione uma nota de 1 a 5 estrelas'),
  comment_text: z
    .string()
    .trim()
    .min(1, 'Escreva um comentário')
    .max(1000, 'Comentário muito longo'),
})
```

And add its inferred type alongside the other `export type ... = z.infer<...>` lines at the bottom of the file:

```ts
export type CommentInput = z.infer<typeof commentSchema>
```

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/lib/schemas.test.ts`
Expected: PASS, all tests including the new `commentSchema` block.

- [x] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat: adicionar commentSchema com validacao de nota e tamanho"
```

---

### Task 4: Comment queries

**Files:**
- Create: `src/features/comments/queries.ts`

- [x] **Step 1: Write the queries**

```ts
import { createClient } from '@/lib/supabase/server'
import type { SupplementComment } from '@/lib/types'

export type CommentStats = {
  comments: SupplementComment[]
  average: number | null
  count: number
}

/** Comentários de um suplemento, mais recente primeiro, com resumo de nota. */
export async function listComments(supplementId: string): Promise<CommentStats> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplement_comments')
    .select('*')
    .eq('supplement_id', supplementId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao carregar comentários: ${error.message}`)

  const comments = (data ?? []) as SupplementComment[]
  const count = comments.length
  const average =
    count === 0
      ? null
      : Math.round(
          (comments.reduce((sum, comment) => sum + comment.rating, 0) / count) * 10
        ) / 10

  return { comments, average, count }
}

export type AdminComment = SupplementComment & { supplement_name: string }

/** Formato exato devolvido pelo select aninhado abaixo. */
type CommentRow = SupplementComment & { supplement: { name: string } | null }

/** Todos os comentários de todos os suplementos, para o painel de moderação. */
export async function listAllComments(): Promise<AdminComment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplement_comments')
    .select('*, supplement:supplements(name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao carregar comentários: ${error.message}`)

  return ((data ?? []) as unknown as CommentRow[]).map((row) => ({
    ...row,
    supplement_name: row.supplement?.name ?? '—',
  }))
}
```

- [x] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/features/comments/queries.ts
git commit -m "feat: adicionar queries de comentarios de suplementos"
```

---

### Task 5: Comment actions

**Files:**
- Create: `src/features/comments/actions.ts`

- [x] **Step 1: Write the actions**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { commentSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

/**
 * Recebe a avaliação de um visitante. Sem sessão/cookie de usuário, então
 * não há limite de um comentário por pessoa — a moderação do admin
 * (deleteComment) é a rede de segurança contra spam/abuso.
 */
export async function submitComment(
  supplementId: string,
  formData: FormData
): Promise<ActionResult> {
  const parsed = commentSchema.safeParse({
    author_name: formData.get('author_name'),
    rating: formData.get('rating'),
    comment_text: formData.get('comment_text'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('supplement_comments').insert({
    supplement_id: supplementId,
    ...parsed.data,
  })

  if (error) return { error: error.message }

  revalidatePath(`/supplements/${supplementId}`)
  return { error: null }
}

export async function deleteComment(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('supplement_comments').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/comments')
  revalidatePath('/supplements/[id]', 'page')
  return { error: null }
}
```

- [x] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/features/comments/actions.ts
git commit -m "feat: adicionar actions de envio e exclusao de comentarios"
```

---

### Task 6: `Tabs` UI primitive

**Files:**
- Create: `src/components/ui/tabs.tsx`

The project pins `shadcn@^4.18.0` and normally adds components via `pnpm dlx shadcn add tabs`, but that CLI call is interactive/network-dependent. Writing the file directly below is the same output shadcn would generate for this project's config (`new-york` style, `radix-ui` unified import, `data-slot` convention — matches `src/components/ui/dialog.tsx`), adapted to the "Organic" pill styling already used for tab-like controls (compare `AdminSidebar`'s nav pills).

- [x] **Step 1: Write the component**

```tsx
"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex h-11 w-fit items-center justify-center gap-1 rounded-full bg-[var(--color-neutral-100)] p-1",
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex h-full flex-1 items-center justify-center rounded-full px-5 font-heading text-sm whitespace-nowrap text-muted-foreground transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [x] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/components/ui/tabs.tsx
git commit -m "feat: adicionar componente Tabs (radix-ui, estilo Organic)"
```

---

### Task 7: `comment-list.tsx` (presentational)

**Files:**
- Create: `src/features/comments/comment-list.tsx`

Mirrors `src/features/quiz/ranking.tsx`: a pure presentational component, no data fetching.

- [x] **Step 1: Write the component**

```tsx
import { Star } from 'lucide-react'
import type { SupplementComment } from '@/lib/types'

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? 'size-4 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]'
              : 'size-4 fill-transparent text-[var(--color-neutral-300)]'
          }
        />
      ))}
    </div>
  )
}

export function CommentList({
  comments,
  average,
  count,
}: {
  comments: SupplementComment[]
  average: number | null
  count: number
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-[22px] bg-card p-5">
        {average === null ? (
          <p className="text-muted-foreground">
            Ninguém avaliou ainda. Seja o primeiro a comentar.
          </p>
        ) : (
          <>
            <span className="font-heading text-3xl">{average.toFixed(1)}</span>
            <div className="space-y-1">
              <StarRow rating={Math.round(average)} />
              <span className="text-sm text-muted-foreground">
                {count} {count === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>
          </>
        )}
      </div>

      {comments.length > 0 && (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-[16px] bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{comment.author_name}</span>
                <StarRow rating={comment.rating} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {comment.comment_text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [x] **Step 2: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 3: Commit**

```bash
git add src/features/comments/comment-list.tsx
git commit -m "feat: adicionar componente de listagem de comentarios"
```

---

### Task 8: `comment-form.tsx` (TDD)

**Files:**
- Create: `src/features/comments/comment-form.tsx`
- Test: `src/features/comments/comment-form.test.tsx`

Mirrors the client-state and error-handling pattern of `src/features/quiz/quiz-runner.tsx`, and the mocked-server-action test pattern of `src/features/quiz/quiz-runner.test.tsx`.

- [x] **Step 1: Write the failing tests**

```tsx
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CommentForm } from './comment-form'
import { submitComment } from './actions'

vi.mock('./actions', () => ({
  submitComment: vi.fn(),
}))

describe('CommentForm', () => {
  beforeEach(() => {
    vi.mocked(submitComment).mockReset()
  })

  it('envia apelido, nota e texto ao suplemento certo', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: null })

    render(<CommentForm supplementId="supp-1" />)

    fireEvent.change(screen.getByLabelText('Seu apelido'), {
      target: { value: 'Ana' },
    })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.change(screen.getByLabelText('Seu comentário'), {
      target: { value: 'Gostei bastante do sabor.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    await waitFor(() => expect(submitComment).toHaveBeenCalledTimes(1))

    const [supplementId, formData] = vi.mocked(submitComment).mock.calls[0]
    expect(supplementId).toBe('supp-1')
    expect(formData.get('author_name')).toBe('Ana')
    expect(formData.get('rating')).toBe('4')
    expect(formData.get('comment_text')).toBe('Gostei bastante do sabor.')
  })

  it('limpa o formulario apos envio bem-sucedido', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: null })

    render(<CommentForm supplementId="supp-1" />)

    const nameInput = screen.getByLabelText('Seu apelido') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.change(screen.getByLabelText('Seu comentário'), {
      target: { value: 'Gostei bastante do sabor.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    await waitFor(() => expect(nameInput.value).toBe(''))
  })

  it('mostra o erro do servidor e mantem o texto digitado', async () => {
    vi.mocked(submitComment).mockResolvedValue({ error: 'Escreva um comentário' })

    render(<CommentForm supplementId="supp-1" />)

    const nameInput = screen.getByLabelText('Seu apelido') as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: '4 estrelas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enviar avaliação' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Escreva um comentário')
    expect(nameInput.value).toBe('Ana')
  })
})
```

- [x] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/features/comments/comment-form.test.tsx`
Expected: FAIL — cannot find module `./comment-form`.

- [x] **Step 3: Write the component**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitComment } from './actions'

export function CommentForm({ supplementId }: { supplementId: string }) {
  const [authorName, setAuthorName] = useState('')
  const [rating, setRating] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitComment(supplementId, formData)

      if (result.error) {
        setError(result.error)
        return
      }

      setAuthorName('')
      setRating(0)
      setCommentText('')
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-[22px] bg-card p-6">
      <div className="space-y-1.5">
        <Label htmlFor="author_name">Seu apelido</Label>
        <Input
          id="author_name"
          name="author_name"
          value={authorName}
          maxLength={40}
          placeholder="Como você quer aparecer"
          onChange={(event) => setAuthorName(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label id="rating-label">Sua nota</Label>
        <input type="hidden" name="rating" value={rating} />
        <div role="group" aria-labelledby="rating-label" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
              aria-pressed={rating >= value}
              onClick={() => setRating(value)}
              className="cursor-pointer p-0.5"
            >
              <Star
                className={
                  rating >= value
                    ? 'size-6 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]'
                    : 'size-6 fill-transparent text-[var(--color-neutral-300)]'
                }
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment_text">Seu comentário</Label>
        <Textarea
          id="comment_text"
          name="comment_text"
          value={commentText}
          maxLength={1000}
          placeholder="O que você achou deste suplemento?"
          onChange={(event) => setCommentText(event.target.value)}
          className="min-h-[100px] rounded-[16px]"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar avaliação'}
      </Button>
    </form>
  )
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/features/comments/comment-form.test.tsx`
Expected: PASS, all three tests.

- [x] **Step 5: Commit**

```bash
git add src/features/comments/comment-form.tsx src/features/comments/comment-form.test.tsx
git commit -m "feat: adicionar formulario de comentario com nota em estrelas"
```

---

### Task 9: Wire tabs into the supplement detail page

**Files:**
- Modify: `src/app/supplements/[id]/page.tsx`

- [x] **Step 1: Fetch comments and restructure the page in tabs**

Replace the full contents of `src/app/supplements/[id]/page.tsx` with:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusTag } from '@/components/status-tag'
import { AlertBadge } from '@/components/alert-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getSupplement } from '@/features/supplements/queries'
import { listComments } from '@/features/comments/queries'
import { CommentList } from '@/features/comments/comment-list'
import { CommentForm } from '@/features/comments/comment-form'

export default async function SupplementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplement = await getSupplement(id)

  if (!supplement) notFound()

  const { comments, average, count } = await listComments(id)

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
          <div className="space-y-4">
            <div className="aspect-[3/4] overflow-hidden rounded-[20px] bg-[var(--color-neutral-100)]">
              {supplement.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={supplement.image_url}
                  alt={supplement.name}
                  className="size-full object-cover [filter:saturate(0.6)_contrast(0.85)_brightness(1.1)]"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    sem foto
                  </span>
                </div>
              )}
            </div>

            {supplement.nutrition_table_url && (
              <figure>
                <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
                  Tabela nutricional
                </span>
                <div className="mt-1.5 overflow-hidden rounded-[16px] bg-[var(--color-neutral-100)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={supplement.nutrition_table_url}
                    alt={`Tabela nutricional de ${supplement.name}`}
                    loading="lazy"
                    className="w-full object-contain"
                  />
                </div>
              </figure>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-10">
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
        </TabsContent>

        <TabsContent value="comments" className="space-y-6">
          <CommentForm supplementId={supplement.id} />
          <CommentList comments={comments} average={average} count={count} />
        </TabsContent>
      </Tabs>

      <p className="border-t border-border pt-6 text-sm text-muted-foreground">
        As informações desta página têm caráter educativo e não substituem a
        orientação de um profissional de saúde.
      </p>
    </div>
  )
}
```

- [x] **Step 2: Run the full test suite**

Run: `pnpm test`
Expected: PASS, no regressions.

- [x] **Step 3: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 4: Manual check in the browser**

Run: `pnpm dev`, open `http://localhost:3000`, click into any supplement, confirm both tabs render, "Comentários" shows the form and the empty-state message ("Ninguém avaliou ainda...").

- [x] **Step 5: Commit**

```bash
git add src/app/supplements/[id]/page.tsx
git commit -m "feat: reestruturar pagina de detalhe do suplemento em abas com comentarios"
```

---

### Task 10: Admin moderation page

**Files:**
- Create: `src/app/admin/comments/comments-table.tsx`
- Create: `src/app/admin/comments/page.tsx`
- Modify: `src/components/admin-sidebar.tsx`

This is read-only + delete, so it does not reuse `CrudManager` (built for editable entities with a create/edit dialog). It follows the same table/pill styling as `CrudManager`'s own table and `GhostAction`.

- [x] **Step 1: Write the comments table component**

Create `src/app/admin/comments/comments-table.tsx` (colocated with the page below since it's only used there, unlike the shared `src/features/comments/` files):

```tsx
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { GhostAction } from '@/components/admin/panel-parts'
import type { AdminComment } from '@/features/comments/queries'
import { deleteComment } from '@/features/comments/actions'

export function CommentsTable({ comments }: { comments: AdminComment[] }) {
  const [rows, setRows] = useState(comments)
  const [, startTransition] = useTransition()

  function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)

    startTransition(async () => {
      const result = await deleteComment(formData)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setRows((current) => current.filter((row) => row.id !== id))
      toast.success('Excluído com sucesso')
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <span className="text-[11px] tracking-[0.1em] text-primary uppercase">
          Cadastros
        </span>
        <h1 className="mt-1 mb-0.5 text-4xl tracking-tight">Comentários</h1>
        <span className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'comentário' : 'comentários'}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[22px] bg-card p-8 text-center text-muted-foreground">
          Nenhum comentário ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[22px] bg-card p-2 shadow-sm">
          <table className="w-full table-fixed border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-[200px] py-2.5 pl-4 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Suplemento
                </th>
                <th className="w-[140px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Apelido
                </th>
                <th className="w-[80px] py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Nota
                </th>
                <th className="py-2.5 pr-2 text-left text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Comentário
                </th>
                <th className="w-[100px] py-2.5 pr-4 text-right text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/60 transition-colors hover:bg-[var(--color-neutral-100)]"
                >
                  <td className="truncate py-3 pr-2 pl-4 font-semibold">
                    {row.supplement_name}
                  </td>
                  <td className="truncate py-3 pr-2 text-muted-foreground">
                    {row.author_name}
                  </td>
                  <td className="py-3 pr-2 text-muted-foreground">
                    {row.rating}/5
                  </td>
                  <td className="truncate py-3 pr-2 text-muted-foreground">
                    {row.comment_text}
                  </td>
                  <td className="py-3 pr-3 text-right whitespace-nowrap">
                    <GhostAction onClick={() => handleDelete(row.id)}>
                      Excluir
                    </GhostAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [x] **Step 2: Write the page that fetches and renders it**

Create `src/app/admin/comments/page.tsx`:

```tsx
import { listAllComments } from '@/features/comments/queries'
import { CommentsTable } from './comments-table'

export default async function AdminCommentsPage() {
  const comments = await listAllComments()
  return <CommentsTable comments={comments} />
}
```

- [x] **Step 3: Add the sidebar nav item**

In `src/components/admin-sidebar.tsx`, modify the `navItems` array:

```ts
const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/brands', label: 'Marcas' },
  { href: '/admin/ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', label: 'Alertas' },
  { href: '/admin/supplements', label: 'Suplementos' },
  { href: '/admin/videos', label: 'Vídeos' },
  { href: '/admin/quiz', label: 'Quiz' },
  { href: '/admin/comments', label: 'Comentários' },
]
```

- [x] **Step 4: Verify it compiles**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors.

- [x] **Step 5: Manual check in the browser**

Run: `pnpm dev`, log into `/admin/login`, open `/admin/comments`, confirm the "Comentários" sidebar link works and the empty-state message shows.

- [x] **Step 6: Commit**

```bash
git add src/app/admin/comments src/components/admin-sidebar.tsx
git commit -m "feat: adicionar painel admin de moderacao de comentarios"
```

---

### Task 11: Apply the migration to Supabase

**Files:** none (database only)

This project's Supabase database only accepts direct connections over IPv6, which isn't available on this machine — prior migrations were applied through the session pooler via `psql`. This requires the database password, which must **never** be pasted into a file in the repo.

- [ ] **Step 1: Confirm with the user before running anything**

Stop and ask the user for explicit go-ahead plus the pooler connection string (or password) for this specific run — do not reuse a previously-seen password from memory/history. This project isn't owned by the person driving this session, so credentials must come from them fresh each time.

- [ ] **Step 2: Apply the migration**

Run (with `$DATABASE_URL` set to the session-pooler connection string provided by the user, e.g. `postgresql://postgres.<project-ref>:<password>@aws-0-us-east-2.pooler.supabase.com:5432/postgres`):

```bash
psql "$DATABASE_URL" -f supabase/migrations/0005_supplement_comments.sql
```

Expected: `CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, and three `CREATE POLICY` confirmations, no errors.

- [ ] **Step 3: Verify RLS from the app**

With `.env.local` filled in (copy from `.env.local.example`, using the project's `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`), run `pnpm dev`, open a supplement page, submit a comment as a visitor (no login) and confirm it appears in the list; then confirm it also appears (and can be deleted) in `/admin/comments` while logged in.

---

### Task 12: Push and open a PR

**Files:** none

- [ ] **Step 1: Push the branch**

Run: `git push -u origin feature/supplement-comments`

- [ ] **Step 2: Open a PR**

Run:
```bash
gh pr create --title "feat: comentários e avaliação de suplementos" --body "$(cat <<'EOF'
## Summary
- Nova tabela `supplement_comments` (nota 1-5 + texto), leitura/escrita públicas via RLS, sem login
- Página de detalhe do suplemento reestruturada em abas: Informações / Comentários
- Painel admin `/admin/comments` para moderar (visualizar/excluir)

## Test plan
- [ ] `pnpm test` passa
- [ ] `pnpm exec tsc --noEmit` sem erros
- [ ] Enviar um comentário como visitante e ver aparecer na aba Comentários
- [ ] Excluir o comentário em `/admin/comments` e confirmar que some da página pública
EOF
)"
```

Only do this after the user confirms they want it pushed — this is someone else's repository.

---

## Self-Review Notes

- **Spec coverage:** rating 1-5 + text (Task 3, 8), anonymous-but-named author (Task 1, 3, 8), tabs restructure (Task 6, 9), admin moderation (Task 10), no per-person limit (documented in Task 5), average shown only on detail page not listing cards (Task 7, 9 — `SupplementListItem`/`searchSupplements` untouched). All spec sections have a task.
- **Type consistency:** `SupplementComment` (Task 2) is used identically in `queries.ts` (Task 4), `comment-list.tsx` (Task 7), and `comment-form.test.tsx` mocks (Task 8). `ActionResult` (from `crud-manager.tsx`) is reused as the return type for both `submitComment` and `deleteComment`, matching the existing `videos`/`quiz` actions.
- **No placeholders:** every step has complete, runnable code; no "add error handling" or "similar to Task N" shortcuts.
