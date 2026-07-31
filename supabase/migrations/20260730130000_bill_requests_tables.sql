-- Fase 7 — Conta e fechamento da mesa (docs/05 §4, docs/07 §"bill_requests",
-- docs/11 AC-BILL-001/002). Toda escrita passa por SECURITY DEFINER
-- (request_table_bill, transition_bill_request_status, close_table_session);
-- nenhuma policy de insert/update para anon/authenticated, mesmo padrão de
-- orders/table_service_sessions nas Fases 5/6.
create type public.bill_request_status as enum (
  'requested', 'acknowledged', 'bill_delivered', 'closed', 'canceled'
);

create table public.bill_requests (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  table_id uuid not null references public.dining_tables (id) on delete restrict,
  table_service_session_id uuid not null references public.table_service_sessions (id) on delete restrict,
  requested_by_guest_session_id uuid references public.guest_sessions (id) on delete set null,
  client_request_id uuid not null,
  status public.bill_request_status not null default 'requested',
  handled_by uuid references public.profiles (id) on delete set null,
  cancellation_reason text,
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  bill_delivered_at timestamptz,
  closed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No máximo uma solicitação ATIVA (não finalizada) por sessão de mesa (docs/03 §regra 5).
create unique index bill_requests_active_per_session_idx
  on public.bill_requests (table_service_session_id)
  where status in ('requested', 'acknowledged', 'bill_delivered');

create index bill_requests_establishment_status_created_idx
  on public.bill_requests (establishment_id, status, created_at desc);

create index bill_requests_session_idx on public.bill_requests (table_service_session_id);

create trigger bill_requests_set_updated_at
  before update on public.bill_requests
  for each row execute function public.set_updated_at();

alter table public.bill_requests enable row level security;
alter table public.bill_requests force row level security;

-- docs/02 §3: "Solicitações de conta" é ao menos "L" para owner/manager/kitchen/cashier/viewer;
-- menu_editor não tem acesso nenhum ("—").
create policy bill_requests_select_staff_or_platform_admin
  on public.bill_requests for select to authenticated
  using (
    (
      public.is_active_member(establishment_id)
      and public.has_tenant_role(
        establishment_id,
        array['owner', 'manager', 'kitchen', 'cashier', 'viewer']::public.member_role[]
      )
    )
    or public.is_platform_admin(null)
  );
