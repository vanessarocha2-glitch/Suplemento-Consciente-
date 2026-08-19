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
