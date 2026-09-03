# Comentários e avaliação de suplementos — Design

**Data:** 2026-09-03
**Contexto:** Nova feature na página de detalhe do suplemento

## Objetivo

Permitir que qualquer visitante (sem conta) avalie um suplemento com uma nota de 1 a 5 estrelas e deixe um comentário escrito, visível publicamente na página do suplemento. Segue o mesmo modelo de confiança já usado no ranking do quiz: sem login, apenas um apelido informado no momento.

## Escopo

### Dentro do escopo

- Nota de 1 a 5 estrelas + comentário escrito, por suplemento, sem necessidade de conta
- Apelido obrigatório (1-40 caracteres) exibido junto ao comentário — mesmo padrão do `player_name` do ranking do quiz
- Reestruturação da página de detalhe do suplemento (`/supplements/[id]`) em abas: "Informações" (conteúdo atual) e "Comentários" (nova)
- Resumo de nota média + contagem de avaliações, calculado a partir dos próprios comentários (sem tabela/view agregada separada)
- Lista de comentários ordenada do mais recente para o mais antigo
- Painel admin (`/admin/comments`) somente leitura + exclusão, para moderação de spam/conteúdo impróprio
- Item "Comentários" na sidebar do admin

### Fora do escopo

- Edição de comentário pelo autor (sem conta, não há como autenticar o autor original)
- Limite de um comentário por pessoa/dispositivo (sem sessão de usuário para rastrear; moderação do admin é a rede de segurança)
- Exibir a nota média nos cards da listagem da home — fica só na página de detalhe por ora
- Respostas do admin aos comentários (thread/reply)
- Denúncia de comentário pelo próprio visitante

## Modelo de dados

### `supplement_comments`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `supplement_id` | UUID | FK → `supplements(id)`, `on delete cascade` |
| `author_name` | text | 1-40 caracteres (trim), mesmo padrão de `quiz_scores.player_name` |
| `rating` | int | `check (rating between 1 and 5)` |
| `comment_text` | text | 1-1000 caracteres (trim) |
| `created_at` | timestamptz | default now() |

### RLS

Diferente do `quiz_scores` (que usa uma função `security definer` porque a nota do quiz precisa de cálculo sigiloso no servidor), aqui não há nada a esconder do cliente — a escrita é uma política de INSERT direta, mais simples e alinhada ao padrão de leitura pública já usado em `categories`, `alerts`, `videos` etc.:

```sql
alter table supplement_comments enable row level security;

create policy "leitura publica" on supplement_comments
  for select using (true);

create policy "escrita publica" on supplement_comments
  for insert to anon, authenticated
  with check (rating between 1 and 5);

create policy "escrita admin" on supplement_comments
  for delete to authenticated using (true);
```

Os `check` constraints da tabela (tamanho de `author_name` e `comment_text`) já protegem a gravação independente da política de RLS — a política de insert só reforça a faixa de `rating`, já que os demais campos são cobertos pelos constraints. Validação de formato (trim, mensagens de erro) roda antes, no zod (`commentSchema`), no mesmo padrão dos outros forms do projeto.

## Estrutura de código

Segue o padrão de features já usado no projeto (`src/features/<nome>/{queries,actions}.ts`):

- `supabase/migrations/0005_supplement_comments.sql` — schema e RLS acima
- `src/lib/types.ts` — adiciona `SupplementComment`
- `src/lib/schemas.ts` — adiciona `commentSchema` (zod: `author_name` 1-40, `rating` 1-5, `comment_text` 1-1000)
- `src/features/comments/queries.ts` — `listComments(supplementId)`; a média e a contagem são derivadas da própria lista retornada (volume esperado é baixo — sem view agregada separada)
- `src/features/comments/actions.ts` — `submitComment(supplementId, authorName, rating, text)` (client público) e `deleteComment(id)` (admin)
- `src/features/comments/comment-form.tsx` — client component: input de apelido, seletor de estrelas (1-5), textarea, botão enviar. Segue o padrão de `quiz-runner.tsx` (`useTransition` + `toast` do sonner para feedback de sucesso/erro)
- `src/features/comments/comment-list.tsx` — resumo (nota média + contagem) e lista de comentários

## UI — página de detalhe em abas

Adiciona `components/ui/tabs.tsx` via shadcn (ainda não instalado no projeto; mesma versão já pinada em `package.json`, `shadcn@^4.18.0`) e reestrutura `app/supplements/[id]/page.tsx` em duas abas:

- **Informações**: todo o conteúdo atual da página (Para que serve, Como usar, Ingredientes, Alertas de uso, Conformidade legislativa, Vídeos)
- **Comentários**: resumo de nota média, formulário de novo comentário, lista de comentários existentes

O visual das abas e do seletor de estrelas segue o design system "Organic" já em uso (tokens `--color-accent-*`, cards com `rounded-[16px]`/`rounded-[28px]`, tipografia `font-heading`), não o estilo shadcn genérico — usar o skill `ui-ux-pro-max` na implementação para manter consistência visual.

## Moderação (admin)

- `app/admin/comments/page.tsx` — lista somente leitura + exclusão (não reaproveita `CrudManager`, que assume edição; aqui só há visualizar e excluir). Colunas: suplemento, apelido, nota, texto, data
- `src/components/admin-sidebar.tsx` — novo item "Comentários" no array `navItems`

## Erros e validação

- Formulário público: erros de validação (apelido vazio/curto/longo, nota fora de 1-5, comentário vazio/muito longo) exibidos inline no form, mesmo padrão do `quiz-runner.tsx` (estado de erro local + mensagem abaixo do campo)
- Falha de rede/servidor no envio: `toast.error` via sonner, mesmo padrão do `crud-manager.tsx`
- Exclusão no admin: `toast.success`/`toast.error` após a ação, mesmo padrão do `crud-manager.tsx`

## Testes

Sigo o padrão existente (vitest + `@testing-library/react`):

- `commentSchema` — validação de limites de `author_name`, `rating` e `comment_text` (mesmo espírito de `scoring.test.ts`)
- `comment-form.tsx` — submissão com sucesso, exibição de erro de validação (mesmo espírito de `alert-badge.test.tsx` / `image-carousel.test.tsx`)
