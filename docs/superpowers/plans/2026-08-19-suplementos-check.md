# Suplemento Consciente — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma plataforma web onde qualquer visitante consulta informações sobre suplementos (ingredientes, finalidade, status Anvisa, conformidade legislativa e alertas) sem login, e um único administrador popula o conteúdo por um painel protegido.

**Architecture:** Next.js App Router com Server Components para leitura pública e Server Actions para escrita do admin. O Supabase (PostgreSQL) guarda os dados; Row Level Security é a fronteira de autorização — `anon` lê, `authenticated` escreve. O modelo é normalizado: ingredientes e alertas são entidades globais ligadas a suplementos por tabelas de junção. A única exceção à regra de escrita é o ranking do quiz, gravado por visitantes sem login através de uma função `security definer` que calcula a nota no próprio banco.

**Tech Stack:** Next.js (App Router, TypeScript), Tailwind CSS, ShadCN/UI, Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Zod para validação, Vitest + Testing Library para testes, pnpm como gerenciador de pacotes.

**Spec:** `docs/superpowers/specs/2026-08-19-suplementos-check-design.md`

---

## Pré-requisitos manuais (fora do código)

Antes da Task 3 o desenvolvedor precisa:

1. Criar um projeto gratuito em https://supabase.com
2. Copiar `Project URL` e `anon public key` de Settings → API
3. Criar o usuário admin em Authentication → Users → "Add user" → "Create new user", com email e senha, marcando **Auto Confirm User**

Não existe tela de cadastro no app. Essa é a única forma de criar o admin.

---

## Estrutura de arquivos

Cada arquivo tem uma responsabilidade. Leitura e escrita ficam separadas (`queries.ts` roda em Server Components, `actions.ts` são Server Actions), e cada entidade mora na sua pasta em `src/features/`.

```
suplementos-check/
├── .env.local.example
├── middleware.ts                          # protege /admin
├── vitest.config.ts
├── supabase/migrations/
│   ├── 0001_schema.sql                    # tabelas, FKs, índices, trigger
│   ├── 0002_rls.sql                       # políticas de segurança
│   └── 0003_quiz_scores.sql               # ranking + função security definer
└── src/
    ├── app/
    │   ├── layout.tsx                     # shell público
    │   ├── page.tsx                       # home: busca + filtro por marca
    │   ├── supplements/[id]/page.tsx      # detalhes
    │   ├── videos/page.tsx
    │   ├── quiz/page.tsx
    │   └── admin/
    │       ├── layout.tsx                 # shell admin (nav + logout)
    │       ├── login/page.tsx
    │       ├── dashboard/page.tsx
    │       ├── brands/page.tsx
    │       ├── ingredients/page.tsx
    │       ├── alerts/page.tsx
    │       ├── supplements/page.tsx
    │       ├── videos/page.tsx
    │       └── quiz/page.tsx
    ├── lib/
    │   ├── supabase/client.ts             # cliente browser
    │   ├── supabase/server.ts             # cliente server (cookies)
    │   ├── supabase/middleware.ts         # refresh de sessão
    │   ├── types.ts                       # tipos das linhas do banco
    │   ├── schemas.ts                     # schemas Zod (validação)
    │   ├── search.ts                      # parsing de query params da busca
    │   └── utils.ts                       # cn() do ShadCN
    ├── features/
    │   ├── brands/{queries,actions}.ts
    │   ├── ingredients/{queries,actions}.ts
    │   ├── alerts/{queries,actions}.ts
    │   ├── supplements/{queries,actions}.ts
    │   ├── videos/{queries,actions}.ts
    │   └── quiz/{queries,actions,scoring}.ts + {quiz-runner,ranking}.tsx
    └── components/
        ├── ui/                            # gerado pelo ShadCN
        ├── crud-manager.tsx               # tabela + form genéricos do admin
        ├── search-bar.tsx
        ├── supplement-card.tsx
        └── alert-badge.tsx
```

**Estratégia de testes:** lógica pura (schemas Zod, parsing de busca, pontuação do quiz, formatação de alertas) é coberta por testes unitários com Vitest — é onde bug silencioso mora. Código que só monta query no Supabase é verificado rodando o app, com passos manuais descritos na própria task; mockar o SDK inteiro testaria o mock, não o código.

---

## Fase 0 — Fundação

### Task 1: Bootstrap do projeto Next.js + Vitest

**Files:**
- Create: projeto inteiro via `create-next-app`
- Create: `vitest.config.ts`
- Create: `src/lib/example.ts`
- Test: `src/lib/example.test.ts`

- [ ] **Step 1: Criar o projeto Next.js**

Rodar na pasta `suplementos-check` (que já contém `docs/`):

```bash
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-pnpm
```

Quando perguntar sobre sobrescrever arquivos existentes, aceitar — `docs/` não é tocado.

- [ ] **Step 2: Inicializar o git e fazer o primeiro commit**

```bash
git init
git add -A
git commit -m "chore: bootstrap Next.js project"
```

- [ ] **Step 3: Instalar as dependências de teste**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 4: Criar a configuração do Vitest**

Criar `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 5: Adicionar o script de teste**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Escrever um teste que falha para validar o setup**

Criar `src/lib/example.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { greet } from './example'

describe('greet', () => {
  it('retorna uma saudação com o nome', () => {
    expect(greet('Vitor')).toBe('Olá, Vitor!')
  })
})
```

- [ ] **Step 7: Rodar o teste para confirmar que falha**

Run: `pnpm test`
Expected: FAIL — `Failed to resolve import "./example"`

- [ ] **Step 8: Implementar o mínimo**

Criar `src/lib/example.ts`:

```ts
export function greet(name: string): string {
  return `Olá, ${name}!`
}
```

- [ ] **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm test`
Expected: PASS — 1 passed

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/lib/example.ts src/lib/example.test.ts
git commit -m "chore: configurar Vitest com Testing Library"
```

---

### Task 2: Instalar e configurar ShadCN/UI

**Files:**
- Create: `components.json`
- Create: `src/components/ui/*` (gerado)
- Modify: `src/app/globals.css` (gerado pelo init)

- [ ] **Step 1: Inicializar o ShadCN**

```bash
pnpm dlx shadcn@latest init
```

Responder: base color `Slate`, CSS variables `yes`.

- [ ] **Step 2: Instalar os componentes que o projeto vai usar**

```bash
pnpm dlx shadcn@latest add button input label card table dialog select textarea badge sonner alert checkbox dropdown-menu
```

- [ ] **Step 3: Verificar que o build passa**

Run: `pnpm build`
Expected: build conclui sem erro de tipo

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: instalar ShadCN/UI e componentes base"
```

---

### Task 3: Clientes Supabase e variáveis de ambiente

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (não versionado)
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Instalar os pacotes do Supabase**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Criar o arquivo de exemplo de ambiente**

Criar `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

- [ ] **Step 3: Criar o `.env.local` real**

```bash
cp .env.local.example .env.local
```

Preencher com os valores do painel do Supabase (Settings → API). Confirmar que `.env*.local` já está no `.gitignore` gerado pelo `create-next-app` — se não estiver, adicionar.

A `service_role key` **nunca** entra neste arquivo. O app usa só a `anon key`; a RLS é quem autoriza.

- [ ] **Step 4: Criar o cliente de browser**

Criar `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 5: Criar o cliente de servidor**

Criar `src/lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components não podem escrever cookies.
            // O middleware renova a sessão, então ignorar aqui é seguro.
          }
        },
      },
    }
  )
}
```

- [ ] **Step 6: Verificar que compila**

Run: `pnpm build`
Expected: build conclui sem erro

- [ ] **Step 7: Commit**

```bash
git add .env.local.example src/lib/supabase package.json pnpm-lock.yaml
git commit -m "feat: adicionar clientes Supabase para browser e servidor"
```

---

### Task 4: Schema do banco de dados

**Files:**
- Create: `supabase/migrations/0001_schema.sql`

- [ ] **Step 1: Escrever a migration do schema**

Criar `supabase/migrations/0001_schema.sql`:

```sql
-- Marcas de suplemento (Dux, Max, etc.)
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- Ingredientes globais, reutilizáveis entre suplementos
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

-- Alertas globais sobre uso inadequado
create table alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  severity text not null default 'warning'
    check (severity in ('info', 'warning', 'danger')),
  created_at timestamptz not null default now()
);

create table supplements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references categories(id) on delete restrict,
  purpose text not null,
  usage_instructions text not null,
  anvisa_status text not null default 'not_found'
    check (anvisa_status in ('approved', 'pending', 'not_found')),
  anvisa_registration text,
  legislation_info jsonb not null default '[]'::jsonb,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table supplement_ingredients (
  supplement_id uuid not null references supplements(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  dosage text,
  primary key (supplement_id, ingredient_id)
);

create table supplement_alerts (
  supplement_id uuid not null references supplements(id) on delete cascade,
  alert_id uuid not null references alerts(id) on delete cascade,
  primary key (supplement_id, alert_id)
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  video_url text not null,
  supplement_id uuid references supplements(id) on delete set null,
  created_at timestamptz not null default now()
);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  explanation text not null,
  category_id uuid references categories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Índices para a busca da home
create index supplements_name_idx on supplements (lower(name));
create index supplements_category_idx on supplements (category_id);

-- Mantém updated_at correto sem depender do app
create function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger supplements_updated_at
  before update on supplements
  for each row execute function set_updated_at();
```

Nota sobre `on delete restrict` em `supplements.category_id`: é o que faz o banco bloquear a exclusão de uma marca em uso, conforme o tratamento de erro previsto no spec.

- [ ] **Step 2: Aplicar a migration**

Abrir o SQL Editor no painel do Supabase, colar o conteúdo de `0001_schema.sql` e executar.

Expected: "Success. No rows returned"

- [ ] **Step 3: Verificar as tabelas**

No SQL Editor, rodar:

```sql
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;
```

Expected: 8 linhas — `alerts`, `categories`, `ingredients`, `quiz_questions`, `supplement_alerts`, `supplement_ingredients`, `supplements`, `videos`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_schema.sql
git commit -m "feat: criar schema do banco de dados"
```

---

### Task 5: Políticas de Row Level Security

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Escrever a migration de RLS**

Criar `supabase/migrations/0002_rls.sql`:

```sql
-- Sem RLS habilitada, a anon key daria escrita total.
alter table categories             enable row level security;
alter table ingredients            enable row level security;
alter table alerts                 enable row level security;
alter table supplements            enable row level security;
alter table supplement_ingredients enable row level security;
alter table supplement_alerts      enable row level security;
alter table videos                 enable row level security;
alter table quiz_questions         enable row level security;

-- Leitura pública: visitantes consultam sem conta.
create policy "leitura publica" on categories             for select using (true);
create policy "leitura publica" on ingredients            for select using (true);
create policy "leitura publica" on alerts                 for select using (true);
create policy "leitura publica" on supplements            for select using (true);
create policy "leitura publica" on supplement_ingredients for select using (true);
create policy "leitura publica" on supplement_alerts      for select using (true);
create policy "leitura publica" on videos                 for select using (true);
create policy "leitura publica" on quiz_questions         for select using (true);

-- Escrita somente para o admin autenticado.
create policy "escrita admin" on categories             for all to authenticated using (true) with check (true);
create policy "escrita admin" on ingredients            for all to authenticated using (true) with check (true);
create policy "escrita admin" on alerts                 for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplements            for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplement_ingredients for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplement_alerts      for all to authenticated using (true) with check (true);
create policy "escrita admin" on videos                 for all to authenticated using (true) with check (true);
create policy "escrita admin" on quiz_questions         for all to authenticated using (true) with check (true);
```

- [ ] **Step 2: Aplicar a migration**

Colar no SQL Editor do Supabase e executar.

Expected: "Success. No rows returned"

- [ ] **Step 3: Verificar que a escrita anônima é bloqueada**

No SQL Editor, rodar:

```sql
set local role anon;
insert into categories (name) values ('Teste Invasor');
```

Expected: ERROR — `new row violates row-level security policy for table "categories"`

Se o insert passar, a RLS não está ativa e o app está exposto. Revisar o Step 1 antes de seguir.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls.sql
git commit -m "feat: habilitar RLS com leitura publica e escrita restrita ao admin"
```

---

### Task 6: Tipos TypeScript do banco

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Escrever os tipos**

Criar `src/lib/types.ts`:

```ts
export type AnvisaStatus = 'approved' | 'pending' | 'not_found'
export type AlertSeverity = 'info' | 'warning' | 'danger'

export type LegislationClaim = {
  claim: string
  compliant: boolean
  note: string
}

export type Category = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type Ingredient = {
  id: string
  name: string
  description: string
  created_at: string
}

export type Alert = {
  id: string
  title: string
  description: string
  severity: AlertSeverity
  created_at: string
}

export type Supplement = {
  id: string
  name: string
  category_id: string
  purpose: string
  usage_instructions: string
  anvisa_status: AnvisaStatus
  anvisa_registration: string | null
  legislation_info: LegislationClaim[]
  image_url: string | null
  created_at: string
  updated_at: string
}

/** Suplemento na listagem da home — só o necessário para o card. */
export type SupplementListItem = Pick<
  Supplement,
  'id' | 'name' | 'image_url' | 'anvisa_status'
> & {
  category: Pick<Category, 'id' | 'name'> | null
}

/** Suplemento na página de detalhes, com tudo que ele referencia. */
export type SupplementDetail = Supplement & {
  category: Category | null
  ingredients: (Ingredient & { dosage: string | null })[]
  alerts: Alert[]
  videos: Video[]
}

export type Video = {
  id: string
  title: string
  description: string
  video_url: string
  supplement_id: string | null
  created_at: string
}

export type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correct_answer: string
  explanation: string
  category_id: string | null
  created_at: string
}

export type QuizScore = {
  id: string
  player_name: string
  correct_count: number
  total_questions: number
  percentage: number
  created_at: string
}

/** Retorno da função submit_quiz_score — a nota vem calculada pelo banco. */
export type SubmittedScore = {
  score_id: string
  correct_count: number
  total_questions: number
  percentage: number
}
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: adicionar tipos TypeScript do banco"
```

---

### Task 7: Schemas de validação com Zod

**Files:**
- Create: `src/lib/schemas.ts`
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Instalar o Zod**

```bash
pnpm add zod
```

- [ ] **Step 2: Escrever os testes que falham**

Criar `src/lib/schemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  categorySchema,
  ingredientSchema,
  alertSchema,
  supplementSchema,
  quizQuestionSchema,
} from './schemas'

describe('categorySchema', () => {
  it('aceita uma marca valida', () => {
    const result = categorySchema.safeParse({ name: 'Dux', description: '' })
    expect(result.success).toBe(true)
  })

  it('rejeita nome vazio', () => {
    const result = categorySchema.safeParse({ name: '', description: '' })
    expect(result.success).toBe(false)
  })

  it('remove espacos em volta do nome', () => {
    const result = categorySchema.parse({ name: '  Max  ', description: '' })
    expect(result.name).toBe('Max')
  })
})

describe('ingredientSchema', () => {
  it('exige descricao', () => {
    const result = ingredientSchema.safeParse({ name: 'Creatina', description: '' })
    expect(result.success).toBe(false)
  })
})

describe('alertSchema', () => {
  it('aceita severidade valida', () => {
    const result = alertSchema.safeParse({
      title: 'Nao recomendado para adolescentes',
      description: 'Consulte um profissional.',
      severity: 'danger',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita severidade desconhecida', () => {
    const result = alertSchema.safeParse({
      title: 'Titulo',
      description: 'Descricao',
      severity: 'critico',
    })
    expect(result.success).toBe(false)
  })
})

describe('supplementSchema', () => {
  const valido = {
    name: 'Whey Protein',
    category_id: '3f1a7c8e-1b2d-4c3e-9f8a-0b1c2d3e4f50',
    purpose: 'Complemento proteico',
    usage_instructions: 'Uma dose ao dia',
    anvisa_status: 'approved',
    anvisa_registration: '6.1234.5678',
    legislation_info: [],
    image_url: '',
    ingredient_ids: [],
    alert_ids: [],
  }

  it('aceita um suplemento valido', () => {
    expect(supplementSchema.safeParse(valido).success).toBe(true)
  })

  it('rejeita category_id que nao e UUID', () => {
    const result = supplementSchema.safeParse({ ...valido, category_id: 'dux' })
    expect(result.success).toBe(false)
  })

  it('converte image_url vazia em null', () => {
    const result = supplementSchema.parse(valido)
    expect(result.image_url).toBeNull()
  })

  it('aceita alegacoes de legislacao', () => {
    const result = supplementSchema.parse({
      ...valido,
      legislation_info: [
        { claim: 'Aumenta massa muscular', compliant: false, note: 'RDC 243/2018' },
      ],
    })
    expect(result.legislation_info).toHaveLength(1)
    expect(result.legislation_info[0].compliant).toBe(false)
  })
})

describe('quizQuestionSchema', () => {
  it('rejeita quando a resposta correta nao esta entre as opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Para que serve a creatina?',
      options: ['Forca', 'Sono'],
      correct_answer: 'Digestao',
      explanation: 'A creatina atua na producao de energia.',
      category_id: '',
    })
    expect(result.success).toBe(false)
  })

  it('aceita quando a resposta correta esta entre as opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Para que serve a creatina?',
      options: ['Forca', 'Sono'],
      correct_answer: 'Forca',
      explanation: 'A creatina atua na producao de energia.',
      category_id: '',
    })
    expect(result.success).toBe(true)
  })

  it('exige pelo menos duas opcoes', () => {
    const result = quizQuestionSchema.safeParse({
      question: 'Pergunta?',
      options: ['Unica'],
      correct_answer: 'Unica',
      explanation: 'Explicacao.',
      category_id: '',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 3: Rodar os testes para confirmar que falham**

Run: `pnpm test src/lib/schemas.test.ts`
Expected: FAIL — `Failed to resolve import "./schemas"`

- [ ] **Step 4: Implementar os schemas**

Criar `src/lib/schemas.ts`:

```ts
import { z } from 'zod'

/** Campo opcional de texto: string vazia do form vira null no banco. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()

/** UUID opcional: select vazio do form vira null. */
const optionalUuid = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .refine(
    (value) => value === null || z.string().uuid().safeParse(value).success,
    { message: 'Selecione uma opção válida' }
  )

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da marca'),
  description: optionalText,
})

export const ingredientSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do ingrediente'),
  description: z.string().trim().min(1, 'Explique para que serve o ingrediente'),
})

export const alertSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título do alerta'),
  description: z.string().trim().min(1, 'Detalhe o alerta'),
  severity: z.enum(['info', 'warning', 'danger']),
})

export const legislationClaimSchema = z.object({
  claim: z.string().trim().min(1, 'Informe a alegação'),
  compliant: z.boolean(),
  note: z.string().trim(),
})

export const supplementSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do suplemento'),
  category_id: z.string().uuid('Selecione uma marca'),
  purpose: z.string().trim().min(1, 'Informe para que serve'),
  usage_instructions: z.string().trim().min(1, 'Informe como usar'),
  anvisa_status: z.enum(['approved', 'pending', 'not_found']),
  anvisa_registration: optionalText,
  legislation_info: z.array(legislationClaimSchema).default([]),
  image_url: optionalText,
  ingredient_ids: z.array(z.string().uuid()).default([]),
  alert_ids: z.array(z.string().uuid()).default([]),
})

export const videoSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título'),
  description: z.string().trim().min(1, 'Informe a descrição'),
  video_url: z.string().trim().url('Informe uma URL válida'),
  supplement_id: optionalUuid,
})

export const quizQuestionSchema = z
  .object({
    question: z.string().trim().min(1, 'Informe a pergunta'),
    options: z
      .array(z.string().trim().min(1))
      .min(2, 'Informe pelo menos duas opções'),
    correct_answer: z.string().trim().min(1, 'Informe a resposta correta'),
    explanation: z.string().trim().min(1, 'Explique a resposta'),
    category_id: optionalUuid,
  })
  .refine((data) => data.options.includes(data.correct_answer), {
    message: 'A resposta correta precisa ser uma das opções',
    path: ['correct_answer'],
  })

export type CategoryInput = z.infer<typeof categorySchema>
export type IngredientInput = z.infer<typeof ingredientSchema>
export type AlertInput = z.infer<typeof alertSchema>
export type SupplementInput = z.infer<typeof supplementSchema>
export type VideoInput = z.infer<typeof videoSchema>
export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

Run: `pnpm test src/lib/schemas.test.ts`
Expected: PASS — 11 passed

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat: adicionar schemas de validacao com Zod"
```

---

## Fase 1 — Autenticação do admin

### Task 8: Middleware de proteção das rotas /admin

**Files:**
- Create: `src/lib/supabase/middleware.ts`
- Create: `middleware.ts` (raiz do projeto)

- [ ] **Step 1: Criar o helper de sessão**

Criar `src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() revalida o token no servidor. Não trocar por getSession(),
  // que apenas lê o cookie e pode ser forjado.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAdminRoute = pathname.startsWith('/admin')
  const isLoginRoute = pathname === '/admin/login'

  if (isAdminRoute && !isLoginRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }

  if (isLoginRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  return response
}
```

- [ ] **Step 2: Criar o middleware do Next.js**

Criar `middleware.ts` na raiz do projeto (mesmo nível de `package.json`):

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Verificar o redirecionamento**

```bash
pnpm dev
```

Abrir http://localhost:3000/admin/dashboard no navegador.
Expected: redireciona para `/admin/login` (que ainda dá 404 — a página vem na Task 9)

- [ ] **Step 4: Commit**

```bash
git add middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat: proteger rotas /admin com middleware de sessao"
```

---

### Task 9: Página de login do admin

**Files:**
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/login/actions.ts`
- Create: `src/app/admin/login/login-form.tsx`

- [ ] **Step 1: Criar a Server Action de login**

Criar `src/app/admin/login/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type LoginState = { error: string | null }

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Preencha email e senha' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Mensagem genérica de propósito: não revelar qual campo falhou.
    return { error: 'Email ou senha incorretos' }
  }

  revalidatePath('/', 'layout')
  redirect('/admin/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/admin/login')
}
```

- [ ] **Step 2: Criar o formulário**

Criar `src/app/admin/login/login-form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { login, type LoginState } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialState: LoginState = { error: null }

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Criar a página**

Criar `src/app/admin/login/page.tsx`:

```tsx
import { LoginForm } from './login-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Painel administrativo</CardTitle>
          <CardDescription>
            Acesso restrito ao administrador do Suplemento Consciente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 4: Testar o login no navegador**

```bash
pnpm dev
```

1. Abrir http://localhost:3000/admin/login
2. Enviar email correto com senha errada → Expected: "Email ou senha incorretos"
3. Enviar as credenciais do admin criado no Supabase → Expected: redireciona para `/admin/dashboard` (404 por enquanto, a página vem na Task 10)
4. Voltar a http://localhost:3000/admin/login já logado → Expected: redireciona para `/admin/dashboard`

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/login
git commit -m "feat: adicionar login do administrador"
```

---

### Task 10: Layout do admin e dashboard

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Criar o layout do admin**

Criar `src/app/admin/layout.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from './login/actions'
import { Button } from '@/components/ui/button'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/brands', label: 'Marcas' },
  { href: '/admin/ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', label: 'Alertas' },
  { href: '/admin/supplements', label: 'Suplementos' },
  { href: '/admin/videos', label: 'Vídeos' },
  { href: '/admin/quiz', label: 'Quiz' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // A página de login usa este layout mas não tem sessão ainda.
  if (!user) return <>{children}</>

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 p-4">
          <span className="font-semibold">Suplemento Consciente</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="ml-auto">
            <Button type="submit" variant="outline" size="sm">
              Sair
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: Criar o dashboard**

Criar `src/app/admin/dashboard/page.tsx`:

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

const sections = [
  { href: '/admin/brands', table: 'categories', label: 'Marcas' },
  { href: '/admin/ingredients', table: 'ingredients', label: 'Ingredientes' },
  { href: '/admin/alerts', table: 'alerts', label: 'Alertas' },
  { href: '/admin/supplements', table: 'supplements', label: 'Suplementos' },
  { href: '/admin/videos', table: 'videos', label: 'Vídeos' },
  { href: '/admin/quiz', table: 'quiz_questions', label: 'Perguntas do quiz' },
] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const counts = await Promise.all(
    sections.map(async (section) => {
      const { count } = await supabase
        .from(section.table)
        .select('*', { count: 'exact', head: true })
      return count ?? 0
    })
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section, index) => (
          <Link key={section.href} href={section.href}>
            <Card className="transition-colors hover:border-foreground/30">
              <CardHeader>
                <CardTitle className="text-3xl">{counts[index]}</CardTitle>
                <CardDescription>{section.label}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verificar no navegador**

```bash
pnpm dev
```

Logar e abrir http://localhost:3000/admin/dashboard
Expected: 6 cards, todos com contagem `0`, e a barra de navegação no topo

- [ ] **Step 4: Testar o logout**

Clicar em "Sair".
Expected: redireciona para `/admin/login`; voltar a `/admin/dashboard` redireciona de novo para o login

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/dashboard
git commit -m "feat: adicionar layout do admin e dashboard com contagens"
```

---

## Fase 2 — CRUD das entidades base

### Task 11: Componente genérico de CRUD

Marcas, ingredientes e alertas têm a mesma forma: uma tabela e um formulário de campos simples. Este componente é escrito uma vez e reaproveitado pelas três telas.

**Files:**
- Create: `src/components/crud-manager.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/components/crud-manager.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export type FieldDef = {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select'
  options?: { value: string; label: string }[]
  required?: boolean
}

export type ActionResult = { error: string | null }

type Row = Record<string, unknown> & { id: string }

type Props = {
  title: string
  rows: Row[]
  fields: FieldDef[]
  columns: { key: string; label: string }[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  deleteAction: (formData: FormData) => Promise<ActionResult>
}

export function CrudManager({
  title,
  rows,
  fields,
  columns,
  saveAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(row: Row) {
    setEditing(row)
    setOpen(true)
  }

  async function handleSave(formData: FormData) {
    const result = await saveAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Salvo com sucesso')
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)
    const result = await deleteAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Excluído com sucesso')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>Novo</Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'}</DialogTitle>
            </DialogHeader>

            {/* key força o React a recriar o form ao trocar de registro,
                senão os defaultValue não atualizam */}
            <form
              key={editing?.id ?? 'new'}
              action={handleSave}
              className="space-y-4"
            >
              {editing && <input type="hidden" name="id" value={editing.id} />}

              {fields.map((field) => {
                const defaultValue = String(editing?.[field.name] ?? '')

                return (
                  <div key={field.name} className="space-y-2">
                    <Label htmlFor={field.name}>{field.label}</Label>

                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.name}
                        name={field.name}
                        defaultValue={defaultValue}
                        required={field.required}
                      />
                    )}

                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        name={field.name}
                        defaultValue={defaultValue}
                        required={field.required}
                      />
                    )}

                    {field.type === 'select' && (
                      <Select name={field.name} defaultValue={defaultValue}>
                        <SelectTrigger id={field.name}>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )
              })}

              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">Nenhum registro cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {String(row[column.key] ?? '—')}
                  </TableCell>
                ))}
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(row.id)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Adicionar o Toaster ao layout raiz**

Em `src/app/layout.tsx`, importar o `Toaster` e renderizá-lo dentro do `<body>`, depois de `{children}`:

```tsx
import { Toaster } from '@/components/ui/sonner'
```

```tsx
        {children}
        <Toaster />
```

- [ ] **Step 3: Verificar que compila**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add src/components/crud-manager.tsx src/app/layout.tsx
git commit -m "feat: adicionar componente generico de CRUD do admin"
```

---

### Task 12: CRUD de marcas

**Files:**
- Create: `src/features/brands/queries.ts`
- Create: `src/features/brands/actions.ts`
- Create: `src/app/admin/brands/page.tsx`

- [ ] **Step 1: Criar as queries**

Criar `src/features/brands/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/lib/types'

export async function listBrands(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (error) throw new Error(`Falha ao listar marcas: ${error.message}`)
  return data ?? []
}
```

- [ ] **Step 2: Criar as actions**

Criar `src/features/brands/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { categorySchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveBrand(formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('categories').update(parsed.data).eq('id', String(id))
    : await supabase.from('categories').insert(parsed.data)

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma marca com esse nome' }
    return { error: error.message }
  }

  revalidatePath('/admin/brands')
  revalidatePath('/')
  return { error: null }
}

export async function deleteBrand(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplements')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam esta marca`,
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/brands')
  revalidatePath('/')
  return { error: null }
}
```

- [ ] **Step 3: Criar a página**

Criar `src/app/admin/brands/page.tsx`:

```tsx
import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listBrands } from '@/features/brands/queries'
import { saveBrand, deleteBrand } from '@/features/brands/actions'

const fields: FieldDef[] = [
  { name: 'name', label: 'Nome da marca', type: 'text', required: true },
  { name: 'description', label: 'Descrição', type: 'textarea' },
]

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'description', label: 'Descrição' },
]

export default async function BrandsPage() {
  const brands = await listBrands()

  return (
    <CrudManager
      title="Marcas"
      rows={brands}
      fields={fields}
      columns={columns}
      saveAction={saveBrand}
      deleteAction={deleteBrand}
    />
  )
}
```

- [ ] **Step 4: Testar no navegador**

```bash
pnpm dev
```

1. Logar e abrir http://localhost:3000/admin/brands
2. Criar "Dux" → Expected: toast "Salvo com sucesso" e a linha aparece na tabela
3. Criar "Max" → Expected: aparece na tabela
4. Criar "Dux" de novo → Expected: toast "Já existe uma marca com esse nome"
5. Editar "Max" para "Max Titanium" → Expected: a tabela atualiza
6. Excluir "Max Titanium" → Expected: some da tabela

- [ ] **Step 5: Commit**

```bash
git add src/features/brands src/app/admin/brands
git commit -m "feat: adicionar CRUD de marcas"
```

---

### Task 13: CRUD de ingredientes

**Files:**
- Create: `src/features/ingredients/queries.ts`
- Create: `src/features/ingredients/actions.ts`
- Create: `src/app/admin/ingredients/page.tsx`

- [ ] **Step 1: Criar as queries**

Criar `src/features/ingredients/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Ingredient } from '@/lib/types'

export async function listIngredients(): Promise<Ingredient[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ingredients')
    .select('*')
    .order('name')

  if (error) throw new Error(`Falha ao listar ingredientes: ${error.message}`)
  return data ?? []
}
```

- [ ] **Step 2: Criar as actions**

Criar `src/features/ingredients/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ingredientSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveIngredient(formData: FormData): Promise<ActionResult> {
  const parsed = ingredientSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('ingredients').update(parsed.data).eq('id', String(id))
    : await supabase.from('ingredients').insert(parsed.data)

  if (error) {
    if (error.code === '23505') {
      return { error: 'Já existe um ingrediente com esse nome' }
    }
    return { error: error.message }
  }

  revalidatePath('/admin/ingredients')
  return { error: null }
}

export async function deleteIngredient(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplement_ingredients')
    .select('*', { count: 'exact', head: true })
    .eq('ingredient_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam este ingrediente`,
    }
  }

  const { error } = await supabase.from('ingredients').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/ingredients')
  return { error: null }
}
```

- [ ] **Step 3: Criar a página**

Criar `src/app/admin/ingredients/page.tsx`:

```tsx
import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listIngredients } from '@/features/ingredients/queries'
import { saveIngredient, deleteIngredient } from '@/features/ingredients/actions'

const fields: FieldDef[] = [
  { name: 'name', label: 'Nome do ingrediente', type: 'text', required: true },
  {
    name: 'description',
    label: 'O que é e para que serve',
    type: 'textarea',
    required: true,
  },
]

const columns = [
  { key: 'name', label: 'Nome' },
  { key: 'description', label: 'Descrição' },
]

export default async function IngredientsPage() {
  const ingredients = await listIngredients()

  return (
    <CrudManager
      title="Ingredientes"
      rows={ingredients}
      fields={fields}
      columns={columns}
      saveAction={saveIngredient}
      deleteAction={deleteIngredient}
    />
  )
}
```

- [ ] **Step 4: Testar no navegador**

Abrir http://localhost:3000/admin/ingredients e criar:

- "Creatina" — "Composto que ajuda na produção de energia durante exercícios de alta intensidade."
- "Vitamina C" — "Antioxidante que participa da defesa do organismo e da absorção de ferro."
- "Cafeína" — "Estimulante do sistema nervoso central que reduz a percepção de fadiga."

Expected: os três aparecem na tabela ordenados por nome (Cafeína, Creatina, Vitamina C)

- [ ] **Step 5: Commit**

```bash
git add src/features/ingredients src/app/admin/ingredients
git commit -m "feat: adicionar CRUD de ingredientes"
```

---

### Task 14: CRUD de alertas

**Files:**
- Create: `src/features/alerts/queries.ts`
- Create: `src/features/alerts/actions.ts`
- Create: `src/app/admin/alerts/page.tsx`

- [ ] **Step 1: Criar as queries**

Criar `src/features/alerts/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Alert } from '@/lib/types'

export async function listAlerts(): Promise<Alert[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('alerts').select('*').order('title')

  if (error) throw new Error(`Falha ao listar alertas: ${error.message}`)
  return data ?? []
}
```

- [ ] **Step 2: Criar as actions**

Criar `src/features/alerts/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { alertSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveAlert(formData: FormData): Promise<ActionResult> {
  const parsed = alertSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    severity: formData.get('severity'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('alerts').update(parsed.data).eq('id', String(id))
    : await supabase.from('alerts').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/alerts')
  return { error: null }
}

export async function deleteAlert(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  const { count } = await supabase
    .from('supplement_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('alert_id', id)

  if (count && count > 0) {
    return {
      error: `Não é possível excluir: ${count} suplemento(s) usam este alerta`,
    }
  }

  const { error } = await supabase.from('alerts').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/alerts')
  return { error: null }
}
```

- [ ] **Step 3: Criar a página**

Criar `src/app/admin/alerts/page.tsx`:

```tsx
import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listAlerts } from '@/features/alerts/queries'
import { saveAlert, deleteAlert } from '@/features/alerts/actions'

const fields: FieldDef[] = [
  { name: 'title', label: 'Título do alerta', type: 'text', required: true },
  { name: 'description', label: 'Detalhamento', type: 'textarea', required: true },
  {
    name: 'severity',
    label: 'Gravidade',
    type: 'select',
    options: [
      { value: 'info', label: 'Informativo' },
      { value: 'warning', label: 'Atenção' },
      { value: 'danger', label: 'Grave' },
    ],
  },
]

const columns = [
  { key: 'title', label: 'Título' },
  { key: 'severity', label: 'Gravidade' },
]

export default async function AlertsPage() {
  const alerts = await listAlerts()

  return (
    <CrudManager
      title="Alertas"
      rows={alerts}
      fields={fields}
      columns={columns}
      saveAction={saveAlert}
      deleteAction={deleteAlert}
    />
  )
}
```

- [ ] **Step 4: Testar no navegador**

Abrir http://localhost:3000/admin/alerts e criar:

- "Não recomendado para adolescentes" / "O uso por menores de 18 anos deve ser avaliado por um profissional de saúde." / Grave
- "Consumo sem orientação profissional" / "Procure um nutricionista ou médico antes de iniciar o uso." / Atenção

Expected: ambos aparecem na tabela com a gravidade correta

- [ ] **Step 5: Commit**

```bash
git add src/features/alerts src/app/admin/alerts
git commit -m "feat: adicionar CRUD de alertas"
```

---

## Fase 3 — Suplementos

### Task 15: Queries de suplementos

**Files:**
- Create: `src/lib/search.ts`
- Create: `src/features/supplements/queries.ts`
- Test: `src/lib/search.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/lib/search.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseSearchParams } from './search'

describe('parseSearchParams', () => {
  it('devolve filtros vazios quando nao ha parametros', () => {
    expect(parseSearchParams({})).toEqual({ term: '', brandId: null })
  })

  it('extrai o termo de busca', () => {
    expect(parseSearchParams({ q: 'whey' })).toEqual({ term: 'whey', brandId: null })
  })

  it('remove espacos em volta do termo', () => {
    expect(parseSearchParams({ q: '  whey  ' }).term).toBe('whey')
  })

  it('extrai a marca selecionada', () => {
    const id = '3f1a7c8e-1b2d-4c3e-9f8a-0b1c2d3e4f50'
    expect(parseSearchParams({ brand: id }).brandId).toBe(id)
  })

  it('ignora marca que nao e UUID', () => {
    expect(parseSearchParams({ brand: 'dux' }).brandId).toBeNull()
  })

  it('trata o valor "all" como sem filtro de marca', () => {
    expect(parseSearchParams({ brand: 'all' }).brandId).toBeNull()
  })

  it('usa o primeiro valor quando o parametro vem repetido', () => {
    expect(parseSearchParams({ q: ['whey', 'creatina'] }).term).toBe('whey')
  })

  it('escapa curingas do LIKE no termo', () => {
    expect(parseSearchParams({ q: '100%' }).term).toBe('100\\%')
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm test src/lib/search.test.ts`
Expected: FAIL — `Failed to resolve import "./search"`

- [ ] **Step 3: Implementar o parsing**

Criar `src/lib/search.ts`:

```ts
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
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm test src/lib/search.test.ts`
Expected: PASS — 8 passed

- [ ] **Step 5: Criar as queries de suplementos**

Criar `src/features/supplements/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { SearchFilters } from '@/lib/search'
import type { SupplementDetail, SupplementListItem } from '@/lib/types'

export async function searchSupplements(
  filters: SearchFilters
): Promise<SupplementListItem[]> {
  const supabase = await createClient()

  let query = supabase
    .from('supplements')
    .select('id, name, image_url, anvisa_status, category:categories(id, name)')
    .order('name')

  if (filters.term) {
    query = query.ilike('name', `%${filters.term}%`)
  }

  if (filters.brandId) {
    query = query.eq('category_id', filters.brandId)
  }

  const { data, error } = await query
  if (error) throw new Error(`Falha ao buscar suplementos: ${error.message}`)

  return (data ?? []) as unknown as SupplementListItem[]
}

export async function getSupplement(
  id: string
): Promise<SupplementDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('supplements')
    .select(
      `
      *,
      category:categories(*),
      supplement_ingredients(dosage, ingredient:ingredients(*)),
      supplement_alerts(alert:alerts(*)),
      videos(*)
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Falha ao carregar suplemento: ${error.message}`)
  if (!data) return null

  // O Supabase devolve as junções aninhadas; achatar aqui mantém
  // os componentes livres do formato do banco.
  const row = data as Record<string, any>

  return {
    ...(row as SupplementDetail),
    category: row.category ?? null,
    ingredients: (row.supplement_ingredients ?? []).map((link: any) => ({
      ...link.ingredient,
      dosage: link.dosage ?? null,
    })),
    alerts: (row.supplement_alerts ?? []).map((link: any) => link.alert),
    videos: row.videos ?? [],
  }
}

/** Ids de ingredientes e alertas já vinculados — usado para preencher o form. */
export async function getSupplementLinks(id: string) {
  const supabase = await createClient()

  const [ingredients, alerts] = await Promise.all([
    supabase.from('supplement_ingredients').select('ingredient_id').eq('supplement_id', id),
    supabase.from('supplement_alerts').select('alert_id').eq('supplement_id', id),
  ])

  return {
    ingredientIds: (ingredients.data ?? []).map((row) => row.ingredient_id),
    alertIds: (alerts.data ?? []).map((row) => row.alert_id),
  }
}

export async function listSupplements(): Promise<SupplementListItem[]> {
  return searchSupplements({ term: '', brandId: null })
}
```

- [ ] **Step 6: Verificar que compila**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add src/lib/search.ts src/lib/search.test.ts src/features/supplements/queries.ts
git commit -m "feat: adicionar busca e leitura de suplementos"
```

---

### Task 16: Actions de suplementos

**Files:**
- Create: `src/features/supplements/actions.ts`

- [ ] **Step 1: Criar as actions**

Criar `src/features/supplements/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { supplementSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

/** Campos JSON e multi-select chegam serializados no FormData. */
function parseJsonField<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== 'string' || raw === '') return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export async function saveSupplement(formData: FormData): Promise<ActionResult> {
  const parsed = supplementSchema.safeParse({
    name: formData.get('name'),
    category_id: formData.get('category_id'),
    purpose: formData.get('purpose'),
    usage_instructions: formData.get('usage_instructions'),
    anvisa_status: formData.get('anvisa_status'),
    anvisa_registration: formData.get('anvisa_registration'),
    legislation_info: parseJsonField(formData.get('legislation_info'), []),
    image_url: formData.get('image_url'),
    ingredient_ids: parseJsonField<string[]>(formData.get('ingredient_ids'), []),
    alert_ids: parseJsonField<string[]>(formData.get('alert_ids'), []),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { ingredient_ids, alert_ids, ...supplement } = parsed.data
  const supabase = await createClient()
  const rawId = formData.get('id')

  let supplementId: string

  if (rawId) {
    supplementId = String(rawId)
    const { error } = await supabase
      .from('supplements')
      .update(supplement)
      .eq('id', supplementId)

    if (error) return { error: error.message }
  } else {
    const { data, error } = await supabase
      .from('supplements')
      .insert(supplement)
      .select('id')
      .single()

    if (error) return { error: error.message }
    supplementId = data.id
  }

  // Junções: apagar e reinserir é mais simples que calcular o diff,
  // e o volume por suplemento é pequeno.
  const { error: clearError } = await Promise.all([
    supabase.from('supplement_ingredients').delete().eq('supplement_id', supplementId),
    supabase.from('supplement_alerts').delete().eq('supplement_id', supplementId),
  ]).then(([ingredients, alerts]) => ({
    error: ingredients.error ?? alerts.error,
  }))

  if (clearError) return { error: clearError.message }

  if (ingredient_ids.length > 0) {
    const { error } = await supabase.from('supplement_ingredients').insert(
      ingredient_ids.map((ingredient_id) => ({
        supplement_id: supplementId,
        ingredient_id,
        dosage: String(formData.get(`dosage_${ingredient_id}`) ?? '') || null,
      }))
    )
    if (error) return { error: error.message }
  }

  if (alert_ids.length > 0) {
    const { error } = await supabase.from('supplement_alerts').insert(
      alert_ids.map((alert_id) => ({ supplement_id: supplementId, alert_id }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/supplements')
  revalidatePath('/')
  revalidatePath(`/supplements/${supplementId}`)
  return { error: null }
}

export async function deleteSupplement(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()

  // As junções somem por ON DELETE CASCADE; os vídeos ficam com
  // supplement_id null por ON DELETE SET NULL.
  const { error } = await supabase.from('supplements').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/supplements')
  revalidatePath('/')
  return { error: null }
}
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/features/supplements/actions.ts
git commit -m "feat: adicionar escrita de suplementos com junções"
```

---

### Task 17: Formulário de suplementos

O formulário de suplemento não cabe no `CrudManager` — tem multi-select com dosagem por ingrediente e uma lista dinâmica de alegações legislativas. Este é um componente próprio.

**Files:**
- Create: `src/features/supplements/supplement-form.tsx`

- [ ] **Step 1: Criar o formulário**

Criar `src/features/supplements/supplement-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Alert, Category, Ingredient, LegislationClaim } from '@/lib/types'
import type { ActionResult } from '@/components/crud-manager'

type Props = {
  brands: Category[]
  ingredients: Ingredient[]
  alerts: Alert[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  onSaved: () => void
}

export function SupplementForm({
  brands,
  ingredients,
  alerts,
  saveAction,
  onSaved,
}: Props) {
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([])
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([])
  const [claims, setClaims] = useState<LegislationClaim[]>([])

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id]
  }

  function addClaim() {
    setClaims([...claims, { claim: '', compliant: true, note: '' }])
  }

  function updateClaim(index: number, patch: Partial<LegislationClaim>) {
    setClaims(claims.map((claim, i) => (i === index ? { ...claim, ...patch } : claim)))
  }

  function removeClaim(index: number) {
    setClaims(claims.filter((_, i) => i !== index))
  }

  async function handleSubmit(formData: FormData) {
    formData.set('ingredient_ids', JSON.stringify(selectedIngredients))
    formData.set('alert_ids', JSON.stringify(selectedAlerts))
    formData.set(
      'legislation_info',
      JSON.stringify(claims.filter((claim) => claim.claim.trim() !== ''))
    )

    const result = await saveAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Suplemento salvo')
    setSelectedIngredients([])
    setSelectedAlerts([])
    setClaims([])
    onSaved()
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do suplemento</Label>
          <Input id="name" name="name" required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Marca</Label>
          <Select name="category_id">
            <SelectTrigger id="category_id">
              <SelectValue placeholder="Selecione a marca" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="purpose">Para que serve</Label>
        <Textarea id="purpose" name="purpose" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="usage_instructions">Como usar</Label>
        <Textarea id="usage_instructions" name="usage_instructions" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="anvisa_status">Situação na Anvisa</Label>
          <Select name="anvisa_status" defaultValue="not_found">
            <SelectTrigger id="anvisa_status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="approved">Regularizado</SelectItem>
              <SelectItem value="pending">Em análise</SelectItem>
              <SelectItem value="not_found">Não localizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="anvisa_registration">Número de registro</Label>
          <Input id="anvisa_registration" name="anvisa_registration" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="image_url">URL da imagem</Label>
        <Input id="image_url" name="image_url" type="url" />
      </div>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Ingredientes</legend>
        {ingredients.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Cadastre ingredientes antes de criar um suplemento.
          </p>
        )}
        {ingredients.map((ingredient) => {
          const checked = selectedIngredients.includes(ingredient.id)
          return (
            <div key={ingredient.id} className="flex items-center gap-3">
              <Checkbox
                id={`ing-${ingredient.id}`}
                checked={checked}
                onCheckedChange={() =>
                  setSelectedIngredients(toggle(selectedIngredients, ingredient.id))
                }
              />
              <Label htmlFor={`ing-${ingredient.id}`} className="flex-1">
                {ingredient.name}
              </Label>
              {checked && (
                <Input
                  name={`dosage_${ingredient.id}`}
                  placeholder="Dosagem (ex: 500mg)"
                  className="w-48"
                />
              )}
            </div>
          )
        })}
      </fieldset>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Alertas</legend>
        {alerts.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum alerta cadastrado.</p>
        )}
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3">
            <Checkbox
              id={`alert-${alert.id}`}
              checked={selectedAlerts.includes(alert.id)}
              onCheckedChange={() =>
                setSelectedAlerts(toggle(selectedAlerts, alert.id))
              }
            />
            <Label htmlFor={`alert-${alert.id}`}>{alert.title}</Label>
          </div>
        ))}
      </fieldset>

      <fieldset className="space-y-3 rounded-md border p-4">
        <legend className="px-1 text-sm font-medium">Conformidade legislativa</legend>

        {claims.map((claim, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <Input
              value={claim.claim}
              placeholder="Alegação do rótulo"
              onChange={(event) => updateClaim(index, { claim: event.target.value })}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id={`compliant-${index}`}
                checked={claim.compliant}
                onCheckedChange={(value) =>
                  updateClaim(index, { compliant: value === true })
                }
              />
              <Label htmlFor={`compliant-${index}`}>
                Está de acordo com a legislação
              </Label>
            </div>
            <Input
              value={claim.note}
              placeholder="Observação (ex: RDC 243/2018)"
              onChange={(event) => updateClaim(index, { note: event.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => removeClaim(index)}
            >
              Remover alegação
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addClaim}>
          Adicionar alegação
        </Button>
      </fieldset>

      <Button type="submit" className="w-full">
        Salvar suplemento
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Verificar que compila**

Run: `pnpm exec tsc --noEmit`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/features/supplements/supplement-form.tsx
git commit -m "feat: adicionar formulario de suplemento"
```

---

### Task 18: Página admin de suplementos

**Files:**
- Create: `src/features/supplements/supplements-manager.tsx`
- Create: `src/app/admin/supplements/page.tsx`

- [ ] **Step 1: Criar o gerenciador**

Criar `src/features/supplements/supplements-manager.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SupplementForm } from './supplement-form'
import type { ActionResult } from '@/components/crud-manager'
import type {
  Alert,
  Category,
  Ingredient,
  SupplementListItem,
} from '@/lib/types'

const statusLabels: Record<string, string> = {
  approved: 'Regularizado',
  pending: 'Em análise',
  not_found: 'Não localizado',
}

type Props = {
  supplements: SupplementListItem[]
  brands: Category[]
  ingredients: Ingredient[]
  alerts: Alert[]
  saveAction: (formData: FormData) => Promise<ActionResult>
  deleteAction: (formData: FormData) => Promise<ActionResult>
}

export function SupplementsManager({
  supplements,
  brands,
  ingredients,
  alerts,
  saveAction,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false)

  async function handleDelete(id: string) {
    const formData = new FormData()
    formData.set('id', id)
    const result = await deleteAction(formData)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Suplemento excluído')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Suplementos</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={brands.length === 0}>Novo suplemento</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo suplemento</DialogTitle>
            </DialogHeader>
            <SupplementForm
              brands={brands}
              ingredients={ingredients}
              alerts={alerts}
              saveAction={saveAction}
              onSaved={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {brands.length === 0 && (
        <p className="text-muted-foreground">
          Cadastre pelo menos uma marca antes de criar suplementos.
        </p>
      )}

      {supplements.length === 0 ? (
        <p className="text-muted-foreground">Nenhum suplemento cadastrado ainda.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Anvisa</TableHead>
              <TableHead className="w-40">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {supplements.map((supplement) => (
              <TableRow key={supplement.id}>
                <TableCell>{supplement.name}</TableCell>
                <TableCell>{supplement.category?.name ?? '—'}</TableCell>
                <TableCell>{statusLabels[supplement.anvisa_status]}</TableCell>
                <TableCell className="space-x-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/supplements/${supplement.id}`}>Ver</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(supplement.id)}
                  >
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Criar a página**

Criar `src/app/admin/supplements/page.tsx`:

```tsx
import { SupplementsManager } from '@/features/supplements/supplements-manager'
import { listSupplements } from '@/features/supplements/queries'
import { saveSupplement, deleteSupplement } from '@/features/supplements/actions'
import { listBrands } from '@/features/brands/queries'
import { listIngredients } from '@/features/ingredients/queries'
import { listAlerts } from '@/features/alerts/queries'

export default async function AdminSupplementsPage() {
  const [supplements, brands, ingredients, alerts] = await Promise.all([
    listSupplements(),
    listBrands(),
    listIngredients(),
    listAlerts(),
  ])

  return (
    <SupplementsManager
      supplements={supplements}
      brands={brands}
      ingredients={ingredients}
      alerts={alerts}
      saveAction={saveSupplement}
      deleteAction={deleteSupplement}
    />
  )
}
```

- [ ] **Step 3: Testar no navegador**

```bash
pnpm dev
```

1. Abrir http://localhost:3000/admin/supplements
2. Criar um suplemento: nome "Whey Protein Concentrado", marca "Dux", finalidade, modo de uso, Anvisa "Regularizado"
3. Marcar os ingredientes "Creatina" e "Vitamina C", preenchendo dosagens
4. Marcar o alerta "Consumo sem orientação profissional"
5. Adicionar uma alegação: "Aumenta a massa muscular", desmarcar "está de acordo", nota "RDC 243/2018"
6. Salvar → Expected: toast "Suplemento salvo", o modal fecha e a linha aparece na tabela
7. Tentar excluir a marca "Dux" em `/admin/brands` → Expected: toast "Não é possível excluir: 1 suplemento(s) usam esta marca"

- [ ] **Step 4: Commit**

```bash
git add src/features/supplements/supplements-manager.tsx src/app/admin/supplements
git commit -m "feat: adicionar pagina admin de suplementos"
```

---

## Fase 4 — Área pública

### Task 19: Home com busca e filtro por marca

**Files:**
- Create: `src/components/search-bar.tsx`
- Create: `src/components/supplement-card.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Criar a barra de busca**

Criar `src/components/search-bar.tsx`:

```tsx
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
import type { Category } from '@/lib/types'

export function SearchBar({ brands }: { brands: Category[] }) {
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
    <form action={submit} className="flex flex-col gap-3 sm:flex-row">
      <Input
        name="q"
        placeholder="Buscar suplemento pelo nome"
        defaultValue={searchParams.get('q') ?? ''}
        className="flex-1"
      />

      <Select name="brand" defaultValue={searchParams.get('brand') ?? 'all'}>
        <SelectTrigger className="sm:w-56">
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

      <Button type="submit">Buscar</Button>
    </form>
  )
}
```

- [ ] **Step 2: Criar o card de suplemento**

Criar `src/components/supplement-card.tsx`:

```tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { SupplementListItem } from '@/lib/types'

const statusLabels: Record<string, string> = {
  approved: 'Regularizado na Anvisa',
  pending: 'Em análise na Anvisa',
  not_found: 'Registro não localizado',
}

export function SupplementCard({ supplement }: { supplement: SupplementListItem }) {
  return (
    <Link href={`/supplements/${supplement.id}`}>
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardHeader>
          <CardTitle>{supplement.name}</CardTitle>
          <CardDescription>{supplement.category?.name ?? 'Sem marca'}</CardDescription>
          <Badge
            variant={supplement.anvisa_status === 'approved' ? 'default' : 'secondary'}
            className="mt-2 w-fit"
          >
            {statusLabels[supplement.anvisa_status]}
          </Badge>
        </CardHeader>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: Atualizar o layout raiz com a navegação pública**

Substituir o corpo de `src/app/layout.tsx` pelo seguinte (mantendo os imports de fonte que o `create-next-app` gerou):

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Suplemento Consciente',
  description:
    'Consulte ingredientes, situação na Anvisa e alertas de uso de suplementos alimentares.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <header className="border-b">
          <div className="mx-auto flex max-w-5xl items-center gap-6 p-4">
            <Link href="/" className="font-semibold">
              Suplemento Consciente
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/videos" className="hover:text-foreground">
                Vídeos
              </Link>
              <Link href="/quiz" className="hover:text-foreground">
                Quiz
              </Link>
            </nav>
          </div>
        </header>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Criar a home**

Substituir `src/app/page.tsx`:

```tsx
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

      <SearchBar brands={brands} />

      {supplements.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            {hasFilters
              ? 'Nenhum suplemento encontrado com esses filtros.'
              : 'Nenhum suplemento cadastrado ainda.'}
          </p>
          {hasFilters && (
            <a href="/" className="mt-2 inline-block text-sm underline">
              Limpar filtros
            </a>
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
```

- [ ] **Step 5: Testar no navegador**

```bash
pnpm dev
```

1. Abrir http://localhost:3000 → Expected: o suplemento cadastrado aparece como card
2. Buscar "whey" → Expected: o card continua na lista, a URL vira `/?q=whey`
3. Buscar "xyz" → Expected: "Nenhum suplemento encontrado com esses filtros." e o link "Limpar filtros"
4. Selecionar a marca "Dux" e buscar → Expected: só suplementos da Dux, URL com `?brand=<uuid>`
5. Selecionar "Todas as marcas" → Expected: o parâmetro `brand` some da URL

- [ ] **Step 6: Commit**

```bash
git add src/components/search-bar.tsx src/components/supplement-card.tsx src/app/layout.tsx src/app/page.tsx
git commit -m "feat: adicionar home com busca e filtro por marca"
```

---

### Task 20: Página de detalhes do suplemento

**Files:**
- Create: `src/components/alert-badge.tsx`
- Create: `src/app/supplements/[id]/page.tsx`
- Test: `src/components/alert-badge.test.tsx`

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/components/alert-badge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertBadge, severityLabel } from './alert-badge'

describe('severityLabel', () => {
  it('traduz cada nivel de gravidade', () => {
    expect(severityLabel('info')).toBe('Informativo')
    expect(severityLabel('warning')).toBe('Atenção')
    expect(severityLabel('danger')).toBe('Grave')
  })
})

describe('AlertBadge', () => {
  const alerta = {
    id: '1',
    title: 'Não recomendado para adolescentes',
    description: 'Procure orientação profissional.',
    severity: 'danger' as const,
    created_at: '2026-01-01T00:00:00Z',
  }

  it('mostra titulo, descricao e gravidade', () => {
    render(<AlertBadge alert={alerta} />)
    expect(screen.getByText('Não recomendado para adolescentes')).toBeDefined()
    expect(screen.getByText('Procure orientação profissional.')).toBeDefined()
    expect(screen.getByText('Grave')).toBeDefined()
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar que falha**

Run: `pnpm test src/components/alert-badge.test.tsx`
Expected: FAIL — `Failed to resolve import "./alert-badge"`

- [ ] **Step 3: Implementar o componente**

Criar `src/components/alert-badge.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'
import type { Alert, AlertSeverity } from '@/lib/types'

const labels: Record<AlertSeverity, string> = {
  info: 'Informativo',
  warning: 'Atenção',
  danger: 'Grave',
}

const variants: Record<AlertSeverity, 'secondary' | 'outline' | 'destructive'> = {
  info: 'secondary',
  warning: 'outline',
  danger: 'destructive',
}

export function severityLabel(severity: AlertSeverity): string {
  return labels[severity]
}

export function AlertBadge({ alert }: { alert: Alert }) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium">{alert.title}</h3>
        <Badge variant={variants[alert.severity]}>{labels[alert.severity]}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{alert.description}</p>
    </div>
  )
}
```

- [ ] **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm test src/components/alert-badge.test.tsx`
Expected: PASS — 2 passed

- [ ] **Step 5: Criar a página de detalhes**

Criar `src/app/supplements/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { AlertBadge } from '@/components/alert-badge'
import { getSupplement } from '@/features/supplements/queries'

const anvisaLabels: Record<string, string> = {
  approved: 'Regularizado na Anvisa',
  pending: 'Em análise na Anvisa',
  not_found: 'Registro não localizado',
}

export default async function SupplementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supplement = await getSupplement(id)

  if (!supplement) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 py-8">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {supplement.category?.name ?? 'Sem marca'}
        </p>
        <h1 className="text-3xl font-semibold">{supplement.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={supplement.anvisa_status === 'approved' ? 'default' : 'secondary'}
          >
            {anvisaLabels[supplement.anvisa_status]}
          </Badge>
          {supplement.anvisa_registration && (
            <span className="text-sm text-muted-foreground">
              Registro {supplement.anvisa_registration}
            </span>
          )}
        </div>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Para que serve</h2>
        <p className="text-muted-foreground">{supplement.purpose}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-medium">Como usar</h2>
        <p className="text-muted-foreground">{supplement.usage_instructions}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-medium">Ingredientes</h2>
        {supplement.ingredients.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum ingrediente cadastrado para este produto.
          </p>
        ) : (
          <ul className="space-y-3">
            {supplement.ingredients.map((ingredient) => (
              <li key={ingredient.id} className="rounded-md border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-medium">{ingredient.name}</h3>
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
      </section>

      {supplement.alerts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Alertas de uso</h2>
          <div className="space-y-3">
            {supplement.alerts.map((alert) => (
              <AlertBadge key={alert.id} alert={alert} />
            ))}
          </div>
        </section>
      )}

      {supplement.legislation_info.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-medium">Conformidade legislativa</h2>
          <ul className="space-y-3">
            {supplement.legislation_info.map((claim, index) => (
              <li key={index} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{claim.claim}</p>
                  <Badge variant={claim.compliant ? 'default' : 'destructive'}>
                    {claim.compliant ? 'Conforme' : 'Não conforme'}
                  </Badge>
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
          <h2 className="text-xl font-medium">Vídeos sobre este suplemento</h2>
          <ul className="space-y-2">
            {supplement.videos.map((video) => (
              <li key={video.id}>
                <a
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {video.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t pt-6 text-sm text-muted-foreground">
        As informações desta página têm caráter educativo e não substituem a
        orientação de um profissional de saúde.
      </p>
    </main>
  )
}
```

- [ ] **Step 6: Testar no navegador**

1. Abrir a home e clicar no card do suplemento
2. Expected: nome, marca, badge da Anvisa, finalidade, modo de uso, ingredientes com dosagem, alertas e a alegação "Aumenta a massa muscular" marcada como "Não conforme"
3. Abrir http://localhost:3000/supplements/00000000-0000-0000-0000-000000000000 → Expected: página 404

- [ ] **Step 7: Commit**

```bash
git add src/components/alert-badge.tsx src/components/alert-badge.test.tsx src/app/supplements
git commit -m "feat: adicionar pagina de detalhes do suplemento"
```

---

## Fase 5 — Conteúdo educativo

### Task 21: Vídeos educativos

**Files:**
- Create: `src/features/videos/queries.ts`
- Create: `src/features/videos/actions.ts`
- Create: `src/app/admin/videos/page.tsx`
- Create: `src/app/videos/page.tsx`

- [ ] **Step 1: Criar as queries**

Criar `src/features/videos/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { Video } from '@/lib/types'

export async function listVideos(): Promise<Video[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Falha ao listar vídeos: ${error.message}`)
  return data ?? []
}
```

- [ ] **Step 2: Criar as actions**

Criar `src/features/videos/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { videoSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

export async function saveVideo(formData: FormData): Promise<ActionResult> {
  const parsed = videoSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    video_url: formData.get('video_url'),
    supplement_id: formData.get('supplement_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('videos').update(parsed.data).eq('id', String(id))
    : await supabase.from('videos').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/videos')
  revalidatePath('/videos')
  return { error: null }
}

export async function deleteVideo(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/videos')
  revalidatePath('/videos')
  return { error: null }
}
```

- [ ] **Step 3: Criar a página admin**

Criar `src/app/admin/videos/page.tsx`:

```tsx
import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listVideos } from '@/features/videos/queries'
import { saveVideo, deleteVideo } from '@/features/videos/actions'
import { listSupplements } from '@/features/supplements/queries'

export default async function AdminVideosPage() {
  const [videos, supplements] = await Promise.all([listVideos(), listSupplements()])

  const fields: FieldDef[] = [
    { name: 'title', label: 'Título', type: 'text', required: true },
    { name: 'description', label: 'Descrição', type: 'textarea', required: true },
    { name: 'video_url', label: 'URL do vídeo', type: 'text', required: true },
    {
      name: 'supplement_id',
      label: 'Suplemento relacionado (opcional)',
      type: 'select',
      options: supplements.map((supplement) => ({
        value: supplement.id,
        label: supplement.name,
      })),
    },
  ]

  const columns = [
    { key: 'title', label: 'Título' },
    { key: 'video_url', label: 'URL' },
  ]

  return (
    <CrudManager
      title="Vídeos"
      rows={videos}
      fields={fields}
      columns={columns}
      saveAction={saveVideo}
      deleteAction={deleteVideo}
    />
  )
}
```

- [ ] **Step 4: Criar a página pública**

Criar `src/app/videos/page.tsx`:

```tsx
import { listVideos } from '@/features/videos/queries'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default async function VideosPage() {
  const videos = await listVideos()

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Vídeos educativos</h1>
        <p className="text-muted-foreground">
          Conteúdos curtos sobre suplementos, usos e cuidados.
        </p>
      </div>

      {videos.length === 0 ? (
        <p className="text-muted-foreground">Nenhum vídeo publicado ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((video) => (
            <a
              key={video.id}
              href={video.video_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="h-full transition-colors hover:border-foreground/30">
                <CardHeader>
                  <CardTitle>{video.title}</CardTitle>
                  <CardDescription>{video.description}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 5: Testar no navegador**

1. Abrir http://localhost:3000/admin/videos e cadastrar um vídeo com uma URL do YouTube, ligado ao suplemento criado
2. Expected: aparece na tabela
3. Abrir http://localhost:3000/videos → Expected: o card do vídeo aparece
4. Abrir a página do suplemento → Expected: o vídeo aparece na seção "Vídeos sobre este suplemento"
5. Cadastrar um vídeo com URL inválida ("abc") → Expected: toast "Informe uma URL válida"

- [ ] **Step 6: Commit**

```bash
git add src/features/videos src/app/admin/videos src/app/videos
git commit -m "feat: adicionar videos educativos"
```

---

> **Amendment (pós Task 5, revisão de segurança):** a Task 5 foi corrigida para remover a leitura pública direta de `quiz_questions` — a coluna `correct_answer` é o gabarito e não pode vazar para o visitante antes (ou durante) a resposta. Existe agora uma função seria `public_quiz_questions()` (`security definer`, sem `correct_answer`) que o visitante usa em vez de `select('*')` na tabela.
>
> Isso afeta as Tasks 22-24, que ainda não foram implementadas quando esta nota foi escrita:
> - **Task 24, página pública (`/quiz`):** buscar as perguntas via `supabase.rpc('public_quiz_questions')`, não via `.from('quiz_questions').select('*')`. O tipo retornado não tem `correct_answer`.
> - **Task 24, página admin (`/admin/quiz`):** continua usando `.from('quiz_questions').select('*')` normalmente — o admin autenticado tem acesso à tabela completa, incluindo `correct_answer`, via a política "escrita admin".
> - **Revelar a resposta certa após o envio:** como o cliente nunca recebe `correct_answer` antes de responder, a Task 23 (`submit_quiz_score`) precisa devolver também o gabarito por pergunta (ex.: um `jsonb` `{question_id: correct_answer}` ou um array de detalhes) na resposta da função — só depois que a nota já foi calculada no banco é seguro revelar. A UI de resultado (`quiz-runner.tsx`, Task 24) deve usar esse gabarito devolvido pelo servidor para colorir as alternativas e mostrar a explicação, em vez de ler `question.correct_answer` (que não existe nos dados públicos).
> - **`scoreQuiz` (Task 22):** continua útil para o cálculo local de UI (contagem, porcentagem, mensagem de desempenho), mas só pode ser chamado com o gabarito depois que ele for devolvido pelo servidor no envio — não antes.
>
> Resolver isso em detalhe quando as Tasks 22-24 forem implementadas, ajustando o código dos blocos abaixo conforme necessário (o texto original das tasks abaixo ainda assume o design antigo, sem essa restrição).

### Task 22: Pontuação do quiz

**Files:**
- Create: `src/features/quiz/scoring.ts`
- Test: `src/features/quiz/scoring.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/features/quiz/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { scoreQuiz, performanceMessage } from './scoring'
import type { QuizQuestion } from '@/lib/types'

const questions: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Para que serve a creatina?',
    options: ['Força', 'Sono'],
    correct_answer: 'Força',
    explanation: 'Atua na produção de energia.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'q2',
    question: 'Suplemento substitui alimentação?',
    options: ['Sim', 'Não'],
    correct_answer: 'Não',
    explanation: 'Suplementos complementam a dieta.',
    category_id: null,
    created_at: '2026-01-01T00:00:00Z',
  },
]

describe('scoreQuiz', () => {
  it('conta zero acertos quando nada foi respondido', () => {
    const result = scoreQuiz(questions, {})
    expect(result.correct).toBe(0)
    expect(result.total).toBe(2)
    expect(result.percentage).toBe(0)
  })

  it('conta os acertos', () => {
    const result = scoreQuiz(questions, { q1: 'Força', q2: 'Sim' })
    expect(result.correct).toBe(1)
    expect(result.percentage).toBe(50)
  })

  it('marca cem por cento quando tudo esta correto', () => {
    const result = scoreQuiz(questions, { q1: 'Força', q2: 'Não' })
    expect(result.correct).toBe(2)
    expect(result.percentage).toBe(100)
  })

  it('detalha o resultado por pergunta', () => {
    const result = scoreQuiz(questions, { q1: 'Sono', q2: 'Não' })
    expect(result.details).toEqual([
      { questionId: 'q1', answered: 'Sono', correct: false },
      { questionId: 'q2', answered: 'Não', correct: true },
    ])
  })

  it('nao divide por zero quando nao ha perguntas', () => {
    const result = scoreQuiz([], {})
    expect(result.percentage).toBe(0)
    expect(result.total).toBe(0)
  })

  it('arredonda a porcentagem para inteiro', () => {
    const tres = [...questions, { ...questions[0], id: 'q3' }]
    const result = scoreQuiz(tres, { q1: 'Força' })
    expect(result.percentage).toBe(33)
  })
})

describe('performanceMessage', () => {
  it('elogia acima de 80 por cento', () => {
    expect(performanceMessage(100)).toBe('Excelente! Você domina o assunto.')
  })

  it('encoraja entre 50 e 79 por cento', () => {
    expect(performanceMessage(60)).toBe('Bom trabalho! Ainda dá para melhorar.')
  })

  it('orienta abaixo de 50 por cento', () => {
    expect(performanceMessage(20)).toBe(
      'Vale revisar o conteúdo e tentar de novo.'
    )
  })
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

Run: `pnpm test src/features/quiz/scoring.test.ts`
Expected: FAIL — `Failed to resolve import "./scoring"`

- [ ] **Step 3: Implementar a pontuação**

Criar `src/features/quiz/scoring.ts`:

```ts
import type { QuizQuestion } from '@/lib/types'

export type Answers = Record<string, string>

export type QuestionResult = {
  questionId: string
  answered: string | null
  correct: boolean
}

export type QuizResult = {
  correct: number
  total: number
  percentage: number
  details: QuestionResult[]
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Answers
): QuizResult {
  const details: QuestionResult[] = questions.map((question) => {
    const answered = answers[question.id] ?? null
    return {
      questionId: question.id,
      answered,
      correct: answered === question.correct_answer,
    }
  })

  const correct = details.filter((detail) => detail.correct).length
  const total = questions.length

  return {
    correct,
    total,
    percentage: total === 0 ? 0 : Math.round((correct / total) * 100),
    details,
  }
}

export function performanceMessage(percentage: number): string {
  if (percentage >= 80) return 'Excelente! Você domina o assunto.'
  if (percentage >= 50) return 'Bom trabalho! Ainda dá para melhorar.'
  return 'Vale revisar o conteúdo e tentar de novo.'
}
```

- [ ] **Step 4: Rodar os testes para confirmar que passam**

Run: `pnpm test src/features/quiz/scoring.test.ts`
Expected: PASS — 9 passed

- [ ] **Step 5: Commit**

```bash
git add src/features/quiz/scoring.ts src/features/quiz/scoring.test.ts
git commit -m "feat: adicionar pontuacao do quiz"
```

---

### Task 23: Ranking do quiz — tabela e função de gravação segura

O ranking é a única escrita feita por quem não tem login. Ela não pode ser um INSERT direto: a `anon key` está visível no navegador, então qualquer pessoa gravaria 100% com o nome que quisesse. A gravação passa por uma função `security definer` que recebe **as respostas**, calcula a nota contra o gabarito guardado no banco e só então insere.

**Files:**
- Create: `supabase/migrations/0003_quiz_scores.sql`

- [ ] **Step 1: Escrever a migration**

Criar `supabase/migrations/0003_quiz_scores.sql`:

```sql
create table quiz_scores (
  id uuid primary key default gen_random_uuid(),
  player_name text not null
    check (char_length(trim(player_name)) between 1 and 40),
  correct_count int not null check (correct_count >= 0),
  total_questions int not null check (total_questions > 0),
  percentage int not null check (percentage between 0 and 100),
  created_at timestamptz not null default now()
);

-- Ordem do ranking: nota, depois acertos, depois quem chegou primeiro.
create index quiz_scores_ranking_idx
  on quiz_scores (percentage desc, correct_count desc, created_at asc);

alter table quiz_scores enable row level security;

-- Leitura pública: qualquer visitante vê o ranking.
create policy "leitura publica" on quiz_scores for select using (true);

-- Nenhuma política de INSERT, de propósito. A gravação só acontece
-- pela função abaixo, que roda como dona da tabela (security definer)
-- e por isso ignora RLS.

create or replace function submit_quiz_score(
  p_player_name text,
  p_answers jsonb
)
returns table (
  score_id uuid,
  correct_count int,
  total_questions int,
  percentage int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_player_name);
  v_id uuid;
  v_correct int;
  v_total int;
  v_percentage int;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 40 then
    raise exception 'Nome inválido';
  end if;

  select count(*) into v_total from quiz_questions;

  if v_total = 0 then
    raise exception 'Nenhuma pergunta cadastrada';
  end if;

  -- O gabarito vem da tabela, nunca do cliente.
  select count(*) into v_correct
  from quiz_questions q
  where p_answers ->> q.id::text = q.correct_answer;

  v_percentage := round((v_correct::numeric / v_total) * 100);

  insert into quiz_scores (player_name, correct_count, total_questions, percentage)
  values (v_name, v_correct, v_total, v_percentage)
  returning id into v_id;

  return query select v_id, v_correct, v_total, v_percentage;
end;
$$;

revoke all on function submit_quiz_score(text, jsonb) from public;
grant execute on function submit_quiz_score(text, jsonb) to anon, authenticated;
```

- [ ] **Step 2: Aplicar a migration**

Colar no SQL Editor do Supabase e executar.

Expected: "Success. No rows returned"

- [ ] **Step 3: Verificar que o INSERT direto é bloqueado**

No SQL Editor:

```sql
set local role anon;
insert into quiz_scores (player_name, correct_count, total_questions, percentage)
values ('Trapaceiro', 99, 99, 100);
```

Expected: ERROR — `new row violates row-level security policy for table "quiz_scores"`

Se o insert passar, qualquer pessoa consegue forjar o ranking. Revisar o Step 1 antes de seguir.

- [ ] **Step 4: Verificar que a função existe e é executável por `anon`**

```sql
select p.proname, p.prosecdef
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'submit_quiz_score';
```

Expected: uma linha com `prosecdef = true` (é `security definer`)

A verificação de que a função calcula a nota corretamente acontece na Task 24, quando já existirem perguntas cadastradas.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0003_quiz_scores.sql
git commit -m "feat: adicionar tabela de ranking e funcao segura de pontuacao"
```

---

### Task 24: Quiz — admin, execução e ranking

**Files:**
- Create: `src/features/quiz/queries.ts`
- Create: `src/features/quiz/actions.ts`
- Create: `src/features/quiz/quiz-runner.tsx`
- Create: `src/features/quiz/ranking.tsx`
- Create: `src/app/admin/quiz/page.tsx`
- Create: `src/app/quiz/page.tsx`

- [ ] **Step 1: Criar as queries**

Criar `src/features/quiz/queries.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import type { QuizQuestion } from '@/lib/types'

export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('*')
    .order('created_at')

  if (error) throw new Error(`Falha ao listar perguntas: ${error.message}`)
  return (data ?? []) as QuizQuestion[]
}

/** Os 10 melhores resultados. A ordem é a mesma do índice quiz_scores_ranking_idx. */
export async function listTopScores(): Promise<QuizScore[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('quiz_scores')
    .select('*')
    .order('percentage', { ascending: false })
    .order('correct_count', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(10)

  if (error) throw new Error(`Falha ao carregar o ranking: ${error.message}`)
  return data ?? []
}
```

Ajustar o import no topo do arquivo para incluir o novo tipo:

```ts
import type { QuizQuestion, QuizScore } from '@/lib/types'
```

- [ ] **Step 2: Criar as actions**

Criar `src/features/quiz/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { quizQuestionSchema } from '@/lib/schemas'
import type { ActionResult } from '@/components/crud-manager'

/** O form envia as opções como uma linha por opção. */
function parseOptions(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? '')
    .split('\n')
    .map((option) => option.trim())
    .filter((option) => option !== '')
}

export async function saveQuizQuestion(formData: FormData): Promise<ActionResult> {
  const parsed = quizQuestionSchema.safeParse({
    question: formData.get('question'),
    options: parseOptions(formData.get('options')),
    correct_answer: formData.get('correct_answer'),
    explanation: formData.get('explanation'),
    category_id: formData.get('category_id'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const id = formData.get('id')

  const { error } = id
    ? await supabase.from('quiz_questions').update(parsed.data).eq('id', String(id))
    : await supabase.from('quiz_questions').insert(parsed.data)

  if (error) return { error: error.message }

  revalidatePath('/admin/quiz')
  revalidatePath('/quiz')
  return { error: null }
}

export async function deleteQuizQuestion(formData: FormData): Promise<ActionResult> {
  const id = String(formData.get('id') ?? '')
  if (!id) return { error: 'Registro inválido' }

  const supabase = await createClient()
  const { error } = await supabase.from('quiz_questions').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/quiz')
  revalidatePath('/quiz')
  return { error: null }
}

export type SubmitScoreResult =
  | { ok: true; score: SubmittedScore; ranking: QuizScore[] }
  | { ok: false; error: string }

/**
 * Recebe as respostas do visitante e delega o cálculo ao banco.
 * A nota nunca vem do cliente — ver submit_quiz_score em 0003_quiz_scores.sql.
 */
export async function submitQuizScore(
  playerName: string,
  answers: Record<string, string>
): Promise<SubmitScoreResult> {
  const name = playerName.trim()

  if (name.length < 1 || name.length > 40) {
    return { ok: false, error: 'Informe um nome de 1 a 40 caracteres' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .rpc('submit_quiz_score', { p_player_name: name, p_answers: answers })
    .single()

  if (error) return { ok: false, error: error.message }

  const ranking = await listTopScores()

  revalidatePath('/quiz')
  return { ok: true, score: data as SubmittedScore, ranking }
}
```

Ajustar os imports no topo do arquivo:

```ts
import { listTopScores } from './queries'
import type { QuizScore, SubmittedScore } from '@/lib/types'
```

- [ ] **Step 3: Criar a página admin do quiz**

Criar `src/app/admin/quiz/page.tsx`:

```tsx
import { CrudManager, type FieldDef } from '@/components/crud-manager'
import { listQuizQuestions } from '@/features/quiz/queries'
import { saveQuizQuestion, deleteQuizQuestion } from '@/features/quiz/actions'
import { listBrands } from '@/features/brands/queries'

export default async function AdminQuizPage() {
  const [questions, brands] = await Promise.all([listQuizQuestions(), listBrands()])

  // O CrudManager renderiza campos de texto; as opções viram uma linha por item.
  const rows = questions.map((question) => ({
    ...question,
    options: question.options.join('\n'),
  }))

  const fields: FieldDef[] = [
    { name: 'question', label: 'Pergunta', type: 'textarea', required: true },
    {
      name: 'options',
      label: 'Opções (uma por linha)',
      type: 'textarea',
      required: true,
    },
    { name: 'correct_answer', label: 'Resposta correta', type: 'text', required: true },
    { name: 'explanation', label: 'Explicação', type: 'textarea', required: true },
    {
      name: 'category_id',
      label: 'Marca relacionada (opcional)',
      type: 'select',
      options: brands.map((brand) => ({ value: brand.id, label: brand.name })),
    },
  ]

  const columns = [
    { key: 'question', label: 'Pergunta' },
    { key: 'correct_answer', label: 'Resposta correta' },
  ]

  return (
    <CrudManager
      title="Perguntas do quiz"
      rows={rows}
      fields={fields}
      columns={columns}
      saveAction={saveQuizQuestion}
      deleteAction={deleteQuizQuestion}
    />
  )
}
```

- [ ] **Step 4: Criar o componente de ranking**

Criar `src/features/quiz/ranking.tsx`:

```tsx
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { QuizScore } from '@/lib/types'

const medals = ['🥇', '🥈', '🥉']

export function Ranking({
  scores,
  highlightId,
}: {
  scores: QuizScore[]
  highlightId?: string
}) {
  if (scores.length === 0) {
    return (
      <p className="text-muted-foreground">
        Ninguém pontuou ainda. Seja o primeiro do ranking.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead className="w-24 text-right">Acertos</TableHead>
          <TableHead className="w-24 text-right">Nota</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scores.map((score, index) => (
          <TableRow
            key={score.id}
            className={score.id === highlightId ? 'bg-muted font-medium' : undefined}
          >
            <TableCell>{medals[index] ?? index + 1}</TableCell>
            <TableCell>{score.player_name}</TableCell>
            <TableCell className="text-right">
              {score.correct_count}/{score.total_questions}
            </TableCell>
            <TableCell className="text-right">{score.percentage}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

- [ ] **Step 5: Criar o executor do quiz**

Criar `src/features/quiz/quiz-runner.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Ranking } from './ranking'
import { submitQuizScore } from './actions'
import { scoreQuiz, performanceMessage, type Answers } from './scoring'
import type { QuizQuestion, QuizScore } from '@/lib/types'

type Stage = 'name' | 'answering' | 'result'

export function QuizRunner({
  questions,
  initialRanking,
}: {
  questions: QuizQuestion[]
  initialRanking: QuizScore[]
}) {
  const [stage, setStage] = useState<Stage>('name')
  const [playerName, setPlayerName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [ranking, setRanking] = useState(initialRanking)
  const [scoreId, setScoreId] = useState<string | undefined>()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Cálculo local, só para colorir as alternativas. A nota que vai ao
  // ranking é a que o banco devolve.
  const result = scoreQuiz(questions, answers)
  const allAnswered = Object.keys(answers).length === questions.length
  const submitted = stage === 'result'

  function start() {
    const name = playerName.trim()
    if (name.length < 1 || name.length > 40) {
      setNameError('Informe um nome de 1 a 40 caracteres')
      return
    }
    setNameError(null)
    setStage('answering')
  }

  function submit() {
    startTransition(async () => {
      const response = await submitQuizScore(playerName, answers)

      if (response.ok) {
        setRanking(response.ranking)
        setScoreId(response.score.score_id)
        setSaveError(null)
      } else {
        // O resultado continua na tela; só o ranking não foi atualizado.
        setSaveError(response.error)
      }

      setStage('result')
    })
  }

  function retry() {
    setAnswers({})
    setScoreId(undefined)
    setSaveError(null)
    setStage('answering')
  }

  if (stage === 'name') {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Antes de começar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="player-name">
                Como você quer aparecer no ranking?
              </Label>
              <Input
                id="player-name"
                value={playerName}
                maxLength={40}
                placeholder="Seu nome ou apelido"
                onChange={(event) => setPlayerName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && start()}
              />
              {nameError && (
                <p role="alert" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>
            <Button onClick={start} className="w-full">
              Começar o quiz
            </Button>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-xl font-medium">Melhores pontuações</h2>
          <Ranking scores={ranking} />
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Jogando como <strong>{playerName.trim()}</strong>
      </p>

      {questions.map((question, index) => {
        const detail = result.details.find((d) => d.questionId === question.id)

        return (
          <Card key={question.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {index + 1}. {question.question}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option
                const isCorrect = option === question.correct_answer

                let style = 'border'
                if (submitted && isCorrect) style = 'border-green-600 bg-green-50'
                else if (submitted && selected) style = 'border-red-600 bg-red-50'
                else if (selected) style = 'border-foreground'

                return (
                  <button
                    key={option}
                    type="button"
                    disabled={submitted || pending}
                    onClick={() =>
                      setAnswers({ ...answers, [question.id]: option })
                    }
                    className={`w-full rounded-md p-3 text-left text-sm ${style}`}
                  >
                    {option}
                  </button>
                )
              })}

              {submitted && (
                <p className="pt-2 text-sm text-muted-foreground">
                  {detail?.correct ? 'Correto. ' : 'Resposta correta: '}
                  {!detail?.correct && (
                    <strong>{question.correct_answer}. </strong>
                  )}
                  {question.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {submitted ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                Você acertou {result.correct} de {result.total} ({result.percentage}%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {performanceMessage(result.percentage)}
              </p>
              {saveError && (
                <p role="alert" className="text-sm text-destructive">
                  Não foi possível registrar sua pontuação no ranking: {saveError}
                </p>
              )}
              <Button onClick={retry}>Refazer o quiz</Button>
            </CardContent>
          </Card>

          <section className="space-y-3">
            <h2 className="text-xl font-medium">Melhores pontuações</h2>
            <Ranking scores={ranking} highlightId={scoreId} />
            {scoreId && !ranking.some((score) => score.id === scoreId) && (
              <p className="text-sm text-muted-foreground">
                Sua pontuação foi registrada, mas ainda não entrou no top 10.
              </p>
            )}
          </section>
        </>
      ) : (
        <Button
          className="w-full"
          disabled={!allAnswered || pending}
          onClick={submit}
        >
          {pending
            ? 'Enviando...'
            : allAnswered
              ? 'Ver resultado'
              : `Responda todas as perguntas (${Object.keys(answers).length}/${questions.length})`}
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Criar a página pública do quiz**

Criar `src/app/quiz/page.tsx`:

```tsx
import { listQuizQuestions, listTopScores } from '@/features/quiz/queries'
import { QuizRunner } from '@/features/quiz/quiz-runner'
import { Ranking } from '@/features/quiz/ranking'

export default async function QuizPage() {
  const [questions, ranking] = await Promise.all([
    listQuizQuestions(),
    listTopScores(),
  ])

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Quiz</h1>
        <p className="text-muted-foreground">
          Teste o que você sabe sobre suplementos e entre no ranking.
        </p>
      </div>

      {questions.length === 0 ? (
        <>
          <p className="text-muted-foreground">
            Nenhuma pergunta cadastrada ainda.
          </p>
          <section className="space-y-3">
            <h2 className="text-xl font-medium">Melhores pontuações</h2>
            <Ranking scores={ranking} />
          </section>
        </>
      ) : (
        <QuizRunner questions={questions} initialRanking={ranking} />
      )}
    </main>
  )
}
```

- [ ] **Step 7: Testar o CRUD de perguntas**

```bash
pnpm dev
```

1. Abrir http://localhost:3000/admin/quiz e cadastrar três perguntas com 3 opções cada
2. Tentar salvar com a resposta correta fora das opções → Expected: toast "A resposta correta precisa ser uma das opções"

- [ ] **Step 8: Verificar o cálculo da nota no banco**

Agora que existem perguntas, testar a função criada na Task 23. No SQL Editor do Supabase, pegar um id e seu gabarito:

```sql
select id, correct_answer from quiz_questions limit 1;
```

Chamar a função com esse id (substituir `<ID>` e `<RESPOSTA>`):

```sql
select * from submit_quiz_score('Teste', '{"<ID>": "<RESPOSTA>"}'::jsonb);
```

Expected: uma linha com `correct_count = 1` e o `percentage` correspondente ao total de perguntas

Agora com uma resposta que não corresponde a nenhuma pergunta:

```sql
select * from submit_quiz_score('Teste 2', '{"00000000-0000-0000-0000-000000000000": "qualquer"}'::jsonb);
```

Expected: `correct_count = 0`, `percentage = 0`

Limpar os dados de teste:

```sql
delete from quiz_scores where player_name in ('Teste', 'Teste 2');
```

- [ ] **Step 9: Testar o fluxo do quiz e do ranking**

1. Abrir http://localhost:3000/quiz → Expected: a tela pede o nome e mostra "Ninguém pontuou ainda"
2. Clicar em "Começar o quiz" com o campo vazio → Expected: "Informe um nome de 1 a 40 caracteres"
3. Informar "Vitor" e começar → Expected: as perguntas aparecem e o botão fica desabilitado mostrando o progresso
4. Responder tudo acertando e clicar em "Ver resultado" → Expected: acertos em verde, explicação sob cada pergunta, o card com a porcentagem, e o ranking com "Vitor" em 1º com 🥇 e a linha destacada
5. Clicar em "Refazer o quiz", errar tudo e enviar → Expected: nova linha no ranking com 0%, abaixo da primeira; a linha destacada agora é a nova
6. Recarregar http://localhost:3000/quiz → Expected: o ranking persiste com as duas entradas na ordem correta

- [ ] **Step 10: Verificar que a nota não pode ser forjada pelo cliente**

Abrir o DevTools na aba Network, responder o quiz e inspecionar a requisição da Server Action.
Expected: o corpo contém o nome e as respostas, **nunca** um campo de pontuação — a nota é calculada no banco

- [ ] **Step 11: Commit**

```bash
git add src/features/quiz src/app/admin/quiz src/app/quiz
git commit -m "feat: adicionar quiz com pontuacao e ranking dos 10 melhores"
```

---

### Task 25: Verificação final

**Files:**
- Modify: nenhum (apenas verificação)
- Create: `README.md`

- [ ] **Step 1: Rodar a suíte de testes completa**

Run: `pnpm test`
Expected: PASS — todos os arquivos de teste passam

- [ ] **Step 2: Rodar o lint**

Run: `pnpm lint`
Expected: sem erros

- [ ] **Step 3: Rodar o build de produção**

Run: `pnpm build`
Expected: build conclui sem erro

- [ ] **Step 4: Remover o arquivo de exemplo do setup**

```bash
rm src/lib/example.ts src/lib/example.test.ts
pnpm test
```

Expected: os testes restantes continuam passando

- [ ] **Step 5: Escrever o README**

Criar `README.md`:

```markdown
# Suplemento Consciente

Plataforma para consulta de informações sobre suplementos alimentares —
ingredientes, finalidade, situação na Anvisa, conformidade legislativa e
alertas de uso. Visitantes consultam sem conta; um único administrador
mantém o conteúdo por um painel protegido.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · ShadCN/UI · Supabase · pnpm

## Rodando localmente

1. Instalar as dependências:

   pnpm install

2. Criar um projeto em https://supabase.com e aplicar as migrations de
   `supabase/migrations/` na ordem, pelo SQL Editor.

3. Criar o usuário administrador em Authentication → Users → Add user,
   marcando "Auto Confirm User". Não há tela de cadastro no app.

4. Copiar `.env.local.example` para `.env.local` e preencher com a URL e a
   anon key do projeto (Settings → API).

5. Subir o servidor:

   pnpm dev

## Scripts

- `pnpm dev` — servidor de desenvolvimento
- `pnpm test` — suíte de testes (Vitest)
- `pnpm build` — build de produção
- `pnpm lint` — ESLint

## Documentação

- Design: `docs/superpowers/specs/2026-08-19-suplementos-check-design.md`
- Plano de implementação: `docs/superpowers/plans/2026-08-19-suplementos-check.md`

## Segurança

O app usa apenas a `anon key` do Supabase. A autorização real está nas
políticas de Row Level Security: qualquer um lê, apenas o admin autenticado
escreve. A `service_role key` nunca deve entrar no código ou no `.env.local`.

A pontuação do quiz é a única escrita feita sem login, e ela não passa por
INSERT direto: a função `submit_quiz_score` recebe as respostas, compara com
o gabarito no banco e calcula a nota. O cliente nunca envia a pontuação.
```

- [ ] **Step 6: Percorrer os dois fluxos completos**

```bash
pnpm dev
```

Fluxo do visitante (em uma janela anônima, sem sessão):
1. Home → buscar por nome → filtrar por marca → abrir um suplemento
2. Conferir ingredientes, alertas, status Anvisa e conformidade
3. Abrir `/videos`
4. Abrir `/quiz`, informar um nome, responder e conferir o ranking
5. Tentar abrir `/admin/dashboard` → Expected: redireciona para `/admin/login`

Fluxo do admin:
1. Logar → dashboard mostra as contagens corretas
2. Editar um suplemento → a mudança aparece na página pública
3. Sair → `/admin/dashboard` volta a redirecionar para o login

- [ ] **Step 7: Commit**

```bash
git add README.md
git rm --cached src/lib/example.ts src/lib/example.test.ts 2>/dev/null || true
git add -A
git commit -m "docs: adicionar README e remover arquivos de exemplo"
```

---

## Cobertura do spec

| Requisito do spec | Task |
|---|---|
| Busca por nome com filtro por marca | 15, 19 |
| Página de detalhes com ingredientes, finalidade, modo de uso | 20 |
| Status e registro Anvisa | 4, 17, 20 |
| Conformidade legislativa (`legislation_info`) | 7, 17, 20 |
| Alertas sobre uso inadequado | 14, 17, 20 |
| Painel admin — marcas | 12 |
| Painel admin — ingredientes | 13 |
| Painel admin — alertas | 14 |
| Painel admin — suplementos com junções | 16, 17, 18 |
| Vídeos educativos | 21 |
| Quiz com pontuação | 22, 24 |
| Ranking dos 10 melhores, nome informado antes de responder | 23, 24 |
| Nota calculada no servidor, impossível de forjar | 23 |
| Login único do admin, sem cadastro | 9 |
| Proteção das rotas `/admin` | 8 |
| RLS: leitura pública, escrita restrita | 5, 23 |
| Modelo normalizado com tabelas de junção | 4 |
| 404 em suplemento inexistente | 20 |
| Estado vazio na busca sem resultados | 19 |
| Erro ao excluir registro em uso | 12, 13, 14 |
| Erro genérico no login inválido | 9 |
| Toast em falha de escrita | 11, 17 |
| Nome do quiz vazio ou longo demais bloqueia o início | 24 |
| Falha ao gravar pontuação preserva o resultado na tela | 24 |
