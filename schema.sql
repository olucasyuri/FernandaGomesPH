-- Rode no Supabase: SQL Editor > New query > Run
create table clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null, contato text, notas text,
  created_at timestamptz default now()
);
create table sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null, data timestamptz, cliente_id uuid references clientes on delete set null,
  local text, status text default 'Agendada',
  created_at timestamptz default now()
);
create table campanhas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null, cliente_id uuid references clientes on delete set null,
  prazo date, etapa text default 'Briefing', notas text,
  created_at timestamptz default now()
);
create table portfolio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null, categoria text, ano int, imagem_url text,
  created_at timestamptz default now()
);

-- Cada usuária só enxerga os próprios dados
do $$ declare t text; begin
  foreach t in array array['clientes','sessoes','campanhas','portfolio'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "dono" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
