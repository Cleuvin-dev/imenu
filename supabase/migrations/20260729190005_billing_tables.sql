-- Fase 2 — Assinatura e gate de acesso.
-- Tabelas de cobrança (plans, subscriptions, invoices, payments,
-- subscription_events) e auditoria (audit_logs) conforme docs/07 e docs/09.

create type public.subscription_status as enum (
  'trialing',
  'active',
  'past_due',
  'suspended',
  'canceled'
);

create type public.invoice_status as enum (
  'draft',
  'open',
  'paid',
  'overdue',
  'void'
);

create type public.payment_status as enum (
  'confirmed',
  'reversed'
);

create type public.payment_method as enum (
  'pix',
  'boleto',
  'transfer',
  'cash',
  'card',
  'other'
);

create type public.audit_actor_scope as enum (
  'platform',
  'establishment',
  'system'
);

-- plans -------------------------------------------------------------------

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code varchar(60) not null,
  name varchar(120) not null check (length(trim(name)) > 0),
  price_cents integer not null check (price_cents >= 0),
  billing_interval_months integer not null default 1 check (billing_interval_months > 0),
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plans_code_key unique (code)
);

create trigger plans_set_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

-- subscriptions -------------------------------------------------------------

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status public.subscription_status not null default 'trialing',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_ends_at timestamptz,
  grace_until timestamptz,
  suspended_at timestamptz,
  suspension_reason public.suspension_reason,
  suspension_note text,
  canceled_at timestamptz,
  billing_provider text,
  external_customer_id text,
  external_subscription_id text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_establishment_key unique (establishment_id),
  constraint subscriptions_suspension_consistency check (
    (suspended_at is null and suspension_reason is null)
    or (suspended_at is not null and suspension_reason is not null)
  )
);

create index subscriptions_status_period_grace_idx
  on public.subscriptions (status, current_period_end, grace_until);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- invoices ------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  reference_period_start date not null,
  reference_period_end date not null,
  amount_cents integer not null check (amount_cents >= 0),
  currency varchar(3) not null default 'BRL',
  status public.invoice_status not null default 'draft',
  issued_at timestamptz,
  due_at timestamptz not null,
  paid_at timestamptz,
  voided_at timestamptz,
  external_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_period_check check (reference_period_end >= reference_period_start),
  constraint invoices_subscription_period_key unique (subscription_id, reference_period_start, reference_period_end)
);

create index invoices_establishment_status_due_idx
  on public.invoices (establishment_id, status, due_at);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- payments --------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status public.payment_status not null default 'confirmed',
  method public.payment_method not null,
  paid_at timestamptz not null,
  reference text,
  note text,
  recorded_by uuid not null references public.profiles (id),
  reversed_at timestamptz,
  reversed_by uuid references public.profiles (id),
  reversal_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_reversal_consistency check (
    (status = 'confirmed' and reversed_at is null and reversed_by is null and reversal_reason is null)
    or (status = 'reversed' and reversed_at is not null and reversed_by is not null and reversal_reason is not null)
  )
);

create index payments_invoice_idx on public.payments (invoice_id);
create index payments_establishment_idx on public.payments (establishment_id, created_at desc);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- subscription_events (histórico imutável) -----------------------------------

create table public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  from_status public.subscription_status,
  to_status public.subscription_status not null,
  event text not null check (length(trim(event)) > 0),
  reason text,
  actor_user_id uuid references public.profiles (id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index subscription_events_subscription_idx
  on public.subscription_events (subscription_id, created_at desc);

-- audit_logs (append-only) -------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles (id),
  actor_scope public.audit_actor_scope not null,
  establishment_id uuid references public.establishments (id) on delete set null,
  action text not null check (length(trim(action)) > 0),
  resource_type text not null,
  resource_id text,
  before_data jsonb,
  after_data jsonb,
  request_id text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index audit_logs_establishment_created_idx
  on public.audit_logs (establishment_id, created_at desc);

create index audit_logs_actor_created_idx
  on public.audit_logs (actor_user_id, created_at desc);
