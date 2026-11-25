-- Run this SQL once in your Supabase SQL Editor to enable persistent database storage & Realtime sync
create table if not exists public.persona_store_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.persona_store_state enable row level security;

-- Public reads are served safely through /api/store (which excludes orders & auth records).
-- Server & Cloudflare Worker access this table using SUPABASE_SERVICE_ROLE_KEY.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'persona_store_state'
  ) then
    alter publication supabase_realtime add table public.persona_store_state;
  end if;
end
$$;
