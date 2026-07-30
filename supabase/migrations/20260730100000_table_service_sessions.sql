-- Fase 5 — Sessão de atendimento da mesa (docs/07 §5, docs/05 §2).
-- Uma sessão "open" por mesa agrega os pedidos entre a chegada e o
-- fechamento da conta (Fase 7). Nunca criada/fechada diretamente por
-- anon/authenticated: só por create_public_order (SECURITY DEFINER) nesta
-- fase; o fechamento chega na Fase 7 (bill_requests).

create type public.table_session_status as enum ('open', 'closed', 'canceled');

create table public.table_service_sessions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  table_id uuid not null references public.dining_tables (id) on delete cascade,
  status public.table_session_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id) on delete set null,
  public_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Só uma sessão aberta por mesa por vez.
create unique index table_service_sessions_open_per_table_idx
  on public.table_service_sessions (table_id)
  where status = 'open';

create index table_service_sessions_establishment_table_idx
  on public.table_service_sessions (establishment_id, table_id, status);

create trigger table_service_sessions_set_updated_at
  before update on public.table_service_sessions
  for each row execute function public.set_updated_at();

alter table public.table_service_sessions enable row level security;
alter table public.table_service_sessions force row level security;

create policy table_service_sessions_select_staff_or_platform_admin
  on public.table_service_sessions for select to authenticated
  using (
    public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );
