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
