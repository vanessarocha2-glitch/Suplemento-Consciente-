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
-- quiz_questions NÃO tem leitura pública aqui: veja função public_quiz_questions() abaixo.

-- Escrita somente para o admin autenticado.
create policy "escrita admin" on categories             for all to authenticated using (true) with check (true);
create policy "escrita admin" on ingredients            for all to authenticated using (true) with check (true);
create policy "escrita admin" on alerts                 for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplements            for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplement_ingredients for all to authenticated using (true) with check (true);
create policy "escrita admin" on supplement_alerts      for all to authenticated using (true) with check (true);
create policy "escrita admin" on videos                 for all to authenticated using (true) with check (true);
create policy "escrita admin" on quiz_questions         for all to authenticated using (true) with check (true);

-- quiz_questions não tem leitura pública: correct_answer é o gabarito e não
-- pode vazar para o cliente antes da resposta. Visitantes leem por esta
-- função, que omite a coluna. O admin continua lendo a tabela direto
-- (política "escrita admin" acima, que inclui select para authenticated).
create or replace function public_quiz_questions()
returns table (
  id uuid,
  question text,
  options jsonb,
  explanation text,
  category_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, question, options, explanation, category_id, created_at
  from quiz_questions
  order by created_at;
$$;

revoke all on function public_quiz_questions() from public;
grant execute on function public_quiz_questions() to anon, authenticated;
