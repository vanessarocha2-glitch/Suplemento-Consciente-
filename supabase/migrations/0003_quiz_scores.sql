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
  percentage int,
  answer_key jsonb
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
  v_answer_key jsonb;
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

  -- Gabarito completo por pergunta, montado só depois que a nota já foi
  -- calculada e gravada — é seguro revelar depois da resposta, nunca antes.
  select jsonb_object_agg(q.id::text, q.correct_answer) into v_answer_key
  from quiz_questions q;

  return query select v_id, v_correct, v_total, v_percentage, v_answer_key;
end;
$$;

revoke all on function submit_quiz_score(text, jsonb) from public;
grant execute on function submit_quiz_score(text, jsonb) to anon, authenticated;
