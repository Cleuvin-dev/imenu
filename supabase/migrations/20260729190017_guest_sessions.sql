-- Fase 4 — Sessão anônima do consumidor (docs/06 §5, docs/07 §5).
-- Nunca acessada diretamente por anon/authenticated: só por RPC SECURITY
-- DEFINER (ensure_guest_session), que valida tudo internamente e nunca
-- devolve o token bruto, apenas confirma a sessão.

create table public.guest_sessions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  table_id uuid not null references public.dining_tables (id) on delete cascade,
  token_hash text not null,
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint guest_sessions_token_hash_key unique (token_hash)
);

create index guest_sessions_establishment_table_idx
  on public.guest_sessions (establishment_id, table_id);

create index guest_sessions_expires_at_idx on public.guest_sessions (expires_at);

alter table public.guest_sessions enable row level security;
alter table public.guest_sessions force row level security;

-- Único acesso direto por RLS: suporte da plataforma pode consultar.
create policy guest_sessions_select_platform_admin
  on public.guest_sessions for select to authenticated
  using (public.is_platform_admin(null));
