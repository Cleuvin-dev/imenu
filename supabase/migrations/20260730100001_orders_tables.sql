-- Fase 5 — Pedido transacional (docs/07 §6, docs/05 §2-3).
-- Todas as escritas passam por funções SECURITY DEFINER
-- (create_public_order, transition_order_status); nenhuma policy de
-- insert/update é concedida a anon/authenticated diretamente — a leitura é
-- liberada para qualquer membro ativo do tenant (docs/02 §3: "Pedidos" é
-- ao menos "L" para todos os papéis, inclusive menu_editor/viewer).

create type public.order_status as enum (
  'pending', 'accepted', 'preparing', 'ready', 'delivered', 'rejected', 'canceled'
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  table_id uuid not null references public.dining_tables (id) on delete restrict,
  table_service_session_id uuid not null references public.table_service_sessions (id) on delete restrict,
  guest_session_id uuid references public.guest_sessions (id) on delete set null,
  order_number text not null,
  order_business_date date not null,
  public_tracking_token_hash text not null,
  client_request_id uuid not null,
  payload_hash text not null,
  status public.order_status not null default 'pending',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'BRL',
  notes text,
  rejection_reason text,
  cancellation_reason text,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  rejected_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_establishment_client_request_key unique (establishment_id, client_request_id),
  constraint orders_establishment_number_date_key unique (establishment_id, order_number, order_business_date),
  constraint orders_tracking_token_hash_key unique (public_tracking_token_hash)
);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
alter table public.orders force row level security;

create policy orders_select_staff_or_platform_admin
  on public.orders for select to authenticated
  using (
    public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  unit_base_price_cents integer not null check (unit_base_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  notes text,
  unit_total_cents integer not null check (unit_total_cents >= 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  product_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;
alter table public.order_items force row level security;

create policy order_items_select_staff_or_platform_admin
  on public.order_items for select to authenticated
  using (
    public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );

create table public.order_item_options (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  option_id uuid references public.options (id) on delete set null,
  group_name_snapshot text not null,
  option_name_snapshot text not null,
  unit_price_delta_cents integer not null check (unit_price_delta_cents >= 0),
  option_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.order_item_options enable row level security;
alter table public.order_item_options force row level security;

create policy order_item_options_select_staff_or_platform_admin
  on public.order_item_options for select to authenticated
  using (
    public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid references public.profiles (id) on delete set null,
  reason text,
  operation_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint order_status_history_order_operation_key unique (order_id, operation_id)
);

alter table public.order_status_history enable row level security;
alter table public.order_status_history force row level security;

create policy order_status_history_select_staff_or_platform_admin
  on public.order_status_history for select to authenticated
  using (
    public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );
