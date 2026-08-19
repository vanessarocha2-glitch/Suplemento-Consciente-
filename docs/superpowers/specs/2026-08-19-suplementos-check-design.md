# Suplemento Consciente — Design

**Data:** 2026-08-19
**Contexto:** Trabalho de TCC

## Objetivo

Plataforma web que permite a qualquer pessoa consultar informações confiáveis sobre suplementos alimentares — ingredientes, finalidade, situação perante a Anvisa, conformidade legislativa e alertas de uso — sem necessidade de criar conta. Um único administrador popula e mantém o conteúdo através de um painel próprio.

## Escopo

### Dentro do escopo

- Busca de suplementos por nome, com filtro por marca
- Página de detalhes do suplemento com ingredientes, finalidade, modo de uso, status Anvisa, conformidade legislativa e alertas
- Painel administrativo com CRUD de marcas, ingredientes, alertas e suplementos
- Vídeos educativos (listagem e associação opcional a suplementos)
- Quiz educativo com perguntas de múltipla escolha e pontuação
- Ranking dos 10 melhores resultados do quiz, com o visitante informando apenas um nome antes de responder

### Fora do escopo

- Leitor de código de barras (removido do conceito original)
- Contas de usuário comum — apenas o administrador faz login
- Histórico de versões dos registros (`supplement_versions`) — desnecessário com um único admin
- Campos de auditoria por autor (`created_by` / `updated_by`) — desnecessário com um único admin
- Soft delete, rascunhos e workflow de publicação
- Integração automática com a API da Anvisa — o status é preenchido manualmente pelo admin

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js (App Router) |
| UI | ShadCN/UI + Tailwind CSS |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (email/senha) |
| Hospedagem | Vercel (app) + Supabase (banco) |
| Gerenciador de pacotes | pnpm |

Supabase foi escolhido sobre Firebase e PlanetScale porque oferece PostgreSQL relacional (adequado ao modelo normalizado), autenticação integrada (sem dependência extra) e Row Level Security nativa — que resolve a separação leitura pública / escrita restrita sem código de autorização próprio.

## Modelo de dados

O modelo é normalizado: ingredientes e alertas são entidades globais reutilizáveis, associadas a suplementos por tabelas de junção. Isso evita duplicação (o mesmo ingrediente descrito uma única vez, referenciado por muitos suplementos) e permite ao admin gerenciá-los de forma independente.

### `categories` — marcas

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | UNIQUE — ex.: Dux, Max |
| `description` | text | opcional |
| `created_at` | timestamptz | default now() |

### `ingredients`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | UNIQUE — ex.: Vitamina C, Creatina |
| `description` | text | explicação simples do que é e para que serve |
| `created_at` | timestamptz | default now() |

### `alerts`

Avisos sobre usos inadequados — principalmente quanto a adolescentes e ao consumo sem orientação profissional.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `title` | text | ex.: "Não recomendado para adolescentes" |
| `description` | text | detalhamento do aviso |
| `severity` | text | `info` \| `warning` \| `danger` |
| `created_at` | timestamptz | default now() |

### `supplements`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `name` | text | |
| `category_id` | UUID | FK → `categories.id` |
| `purpose` | text | para que serve |
| `usage_instructions` | text | como usar |
| `anvisa_status` | text | `approved` \| `pending` \| `not_found` |
| `anvisa_registration` | text | opcional — número de registro |
| `legislation_info` | JSONB | conformidade das alegações — ver formato abaixo |
| `image_url` | text | opcional |
| `created_at` | timestamptz | default now() |
| `updated_at` | timestamptz | atualizado via trigger |

Formato de `legislation_info` — lista de alegações avaliadas:

```json
[
  {
    "claim": "Aumenta a massa muscular",
    "compliant": false,
    "note": "Alegação não permitida pela RDC 243/2018 para este tipo de produto"
  }
]
```

O array pode ser vazio quando o admin ainda não avaliou as alegações.

### `supplement_ingredients` — junção N:N

| Campo | Tipo | Notas |
|---|---|---|
| `supplement_id` | UUID | FK → `supplements.id`, ON DELETE CASCADE |
| `ingredient_id` | UUID | FK → `ingredients.id`, ON DELETE CASCADE |
| `dosage` | text | opcional — ex.: "500mg" |
| | | PK composta (`supplement_id`, `ingredient_id`) |

### `supplement_alerts` — junção N:N

| Campo | Tipo | Notas |
|---|---|---|
| `supplement_id` | UUID | FK → `supplements.id`, ON DELETE CASCADE |
| `alert_id` | UUID | FK → `alerts.id`, ON DELETE CASCADE |
| | | PK composta (`supplement_id`, `alert_id`) |

### `videos`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `title` | text | |
| `description` | text | |
| `video_url` | text | YouTube, Vimeo, etc. |
| `supplement_id` | UUID | FK → `supplements.id`, opcional, ON DELETE SET NULL |
| `created_at` | timestamptz | default now() |

### `quiz_questions`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `question` | text | |
| `options` | JSONB | array de strings |
| `correct_answer` | text | deve corresponder a um item de `options` |
| `explanation` | text | mostrada após a resposta |
| `category_id` | UUID | FK → `categories.id`, opcional, ON DELETE SET NULL |
| `created_at` | timestamptz | default now() |

### `quiz_scores` — ranking

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `player_name` | text | 1 a 40 caracteres, informado pelo visitante |
| `correct_count` | int | acertos |
| `total_questions` | int | total de perguntas no momento da tentativa |
| `percentage` | int | 0 a 100 |
| `created_at` | timestamptz | default now() |

O ranking exibe as 10 melhores tentativas, ordenadas por `percentage` desc, depois `correct_count` desc, depois `created_at` asc — em empate, quem pontuou primeiro fica na frente. Cada tentativa é uma linha; a mesma pessoa pode aparecer mais de uma vez.

`percentage` é guardado porque o número de perguntas cresce com o tempo — comparar acertos absolutos entre tentativas de tamanhos diferentes seria injusto.

### Relacionamentos

```
categories 1─N supplements
categories 1─N quiz_questions (opcional)
supplements N─N ingredients   (via supplement_ingredients)
supplements N─N alerts        (via supplement_alerts)
supplements 1─N videos        (opcional)
```

## Segurança

Row Level Security habilitada em todas as tabelas públicas, com duas políticas por tabela:

- **SELECT** — liberado para o papel `anon` (qualquer visitante lê sem login)
- **INSERT / UPDATE / DELETE** — restrito ao papel `authenticated` (somente o admin logado escreve)

A conta do administrador é criada manualmente no painel do Supabase. O app não expõe tela de cadastro. Rotas sob `/admin` são protegidas por middleware que verifica a sessão e redireciona para `/admin/login` quando ausente.

A chave `service_role` do Supabase nunca é exposta ao cliente; o front-end usa apenas a `anon key`, e a RLS é a fronteira de autorização real.

### Envio de pontuação sem login

O ranking é a única escrita feita por quem não está autenticado, e ela não pode ser um INSERT direto: a `anon key` fica visível no navegador, então qualquer pessoa poderia gravar 100% em nome de quem quisesse.

A gravação passa por uma função Postgres `submit_quiz_score(player_name, answers)` marcada como `security definer`. O cliente envia **as respostas**, nunca a nota. A função compara cada resposta com o `correct_answer` guardado no banco, calcula a pontuação, grava a linha e devolve o resultado. `anon` recebe apenas permissão de EXECUTE nessa função — `quiz_scores` não tem política de INSERT para ninguém.

Consequência: a nota do ranking é sempre calculada pelo servidor a partir do gabarito real. O cálculo em TypeScript no cliente existe só para colorir as alternativas na tela.

## Estrutura de rotas

```
app/
├── layout.tsx
├── page.tsx                       # Home: busca + filtro por marca
├── supplements/[id]/page.tsx      # Detalhes do suplemento
├── quiz/page.tsx
├── videos/page.tsx
└── admin/
    ├── login/page.tsx
    ├── dashboard/page.tsx
    ├── supplements/page.tsx       # CRUD suplementos
    ├── brands/page.tsx            # CRUD marcas
    ├── ingredients/page.tsx       # CRUD ingredientes
    ├── alerts/page.tsx            # CRUD alertas
    ├── quiz/page.tsx              # CRUD perguntas
    └── videos/page.tsx            # CRUD vídeos
```

Leituras públicas acontecem em Server Components consultando o Supabase diretamente. Escritas do admin acontecem em Server Actions, que rodam no servidor com a sessão autenticada.

## Fluxos

**Visitante:** abre a home → digita no campo de busca e/ou seleciona uma marca → vê a lista filtrada → abre um suplemento → lê ingredientes, finalidade, modo de uso, status Anvisa, conformidade legislativa e alertas. Pode também navegar para vídeos e para o quiz.

**Visitante no quiz:** informa um nome → responde as perguntas → envia → vê o resultado com a explicação de cada questão e o ranking dos 10 melhores atualizado, com sua posição destacada quando entrar na lista.

**Administrador:** faz login → dashboard → cadastra marcas, ingredientes e alertas (entidades base) → cadastra suplementos, associando marca, ingredientes (com dosagem) e alertas → opcionalmente cadastra vídeos e perguntas de quiz.

A ordem importa: marcas, ingredientes e alertas precisam existir antes de um suplemento poder referenciá-los.

## Tratamento de erros

- Busca sem resultados exibe estado vazio com sugestão de limpar filtros, não um erro
- Suplemento inexistente em `/supplements/[id]` retorna 404 via `notFound()`
- Falha de escrita no painel exibe toast com a mensagem do erro; o formulário mantém os dados preenchidos
- Tentativa de excluir marca/ingrediente/alerta em uso é bloqueada pela FK; a mensagem informa quantos suplementos dependem do registro
- Login inválido exibe erro genérico ("email ou senha incorretos"), sem distinguir qual campo falhou
- Nome vazio ou acima de 40 caracteres no quiz bloqueia o início, com mensagem no próprio campo
- Falha ao gravar a pontuação mostra o resultado assim mesmo, com um aviso de que o ranking não foi atualizado — o visitante não perde o que respondeu

## Priorização

**Fase 1 — núcleo funcional**
1. Setup do projeto (Next.js, ShadCN, Supabase, schema + RLS)
2. Autenticação do admin e proteção das rotas `/admin`
3. CRUD de marcas, ingredientes e alertas
4. CRUD de suplementos com associação de ingredientes e alertas
5. Home com busca e filtro por marca
6. Página de detalhes do suplemento

**Fase 2 — conteúdo educativo**
7. Vídeos (CRUD admin + listagem pública)
8. Quiz (CRUD admin + execução com pontuação)
9. Ranking dos 10 melhores resultados do quiz

## Decisões em aberto

Nenhuma. O escopo, o modelo de dados e a stack estão definidos.
