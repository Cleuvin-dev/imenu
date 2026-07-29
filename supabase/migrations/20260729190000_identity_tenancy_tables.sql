-- Fase 1 — Identidade, tenancy e RLS
-- Enums e tabelas base de identidade/tenancy: profiles, platform_admins,
-- establishments, establishment_members, member_invites.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.member_role as enum (
  'owner',
  'manager',
  'menu_editor',
  'kitchen',
  'cashier',
  'viewer'
);

create type public.platform_role as enum (
  'super_admin',
  'platform_admin',
  'platform_support'
);

create type public.suspension_reason as enum (
  'overdue',
  'manual',
  'fraud',
  'contract_end',
  'other'
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name varchar(120) not null check (length(trim(display_name)) > 0),
  email citext not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_key on public.profiles (email);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- platform_admins -------------------------------------------------------

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.platform_role not null,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index platform_admins_active_idx on public.platform_admins (is_active);

create trigger platform_admins_set_updated_at
  before update on public.platform_admins
  for each row execute function public.set_updated_at();

-- establishments ----------------------------------------------------------

create table public.establishments (
  id uuid primary key default gen_random_uuid(),
  legal_name varchar(180) not null check (length(trim(legal_name)) > 0),
  trade_name varchar(180) not null check (length(trim(trade_name)) > 0),
  slug varchar(140) not null,
  document_number varchar(32),
  owner_contact_name varchar(160),
  email citext,
  phone varchar(32),
  address_line varchar(200),
  address_number varchar(20),
  address_complement varchar(120),
  neighborhood varchar(120),
  city varchar(120),
  state_code varchar(2),
  postal_code varchar(16),
  timezone text not null default 'America/Sao_Paulo',
  currency varchar(3) not null default 'BRL',
  logo_path text,
  cover_path text,
  is_active boolean not null default true,
  accepting_orders boolean not null default true,
  manual_suspended_at timestamptz,
  manual_suspension_reason public.suspension_reason,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishments_slug_key unique (slug),
  constraint establishments_document_number_key unique (document_number),
  constraint establishments_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint establishments_state_code_format check (state_code is null or state_code ~ '^[A-Z]{2}$'),
  constraint establishments_manual_suspension_consistency check (
    (manual_suspended_at is null and manual_suspension_reason is null)
    or (manual_suspended_at is not null and manual_suspension_reason is not null)
  )
);

create trigger establishments_set_updated_at
  before update on public.establishments
  for each row execute function public.set_updated_at();

-- establishment_members -----------------------------------------------------

create table public.establishment_members (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  is_active boolean not null default true,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint establishment_members_tenant_user_key unique (establishment_id, user_id)
);

create index establishment_members_user_active_idx
  on public.establishment_members (user_id, is_active);

create index establishment_members_tenant_role_active_idx
  on public.establishment_members (establishment_id, role, is_active);

create trigger establishment_members_set_updated_at
  before update on public.establishment_members
  for each row execute function public.set_updated_at();

-- Garante que o único owner ativo de um estabelecimento nunca seja removido
-- ou rebaixado, mesmo por uma via futura que não passe pela camada de
-- aplicação (docs/02_PERSONAS_PAPEIS_E_PERMISSOES.md, regra 4).
create or replace function public.enforce_last_owner_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  remaining_owners integer;
  becomes_unsafe boolean;
begin
  if tg_op = 'DELETE' then
    becomes_unsafe := old.role = 'owner' and old.is_active;
  else
    becomes_unsafe := old.role = 'owner' and old.is_active
      and (new.role <> 'owner' or new.is_active = false);
  end if;

  if not becomes_unsafe then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select count(*) into remaining_owners
  from public.establishment_members
  where establishment_id = old.establishment_id
    and role = 'owner'
    and is_active
    and id <> old.id;

  if remaining_owners = 0 then
    raise exception 'establishment_members_last_owner_guard: não é possível remover ou rebaixar o único owner ativo do estabelecimento'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger establishment_members_last_owner_guard
  before update or delete on public.establishment_members
  for each row execute function public.enforce_last_owner_guard();

-- member_invites --------------------------------------------------------

create table public.member_invites (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  email citext not null,
  role public.member_role not null,
  token_hash text not null,
  invited_by uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index member_invites_token_hash_key on public.member_invites (token_hash);

create index member_invites_tenant_email_idx
  on public.member_invites (establishment_id, email);

-- Impede convite pendente duplicado para o mesmo e-mail/estabelecimento.
create unique index member_invites_pending_unique
  on public.member_invites (establishment_id, email)
  where accepted_at is null and revoked_at is null;

create trigger member_invites_set_updated_at
  before update on public.member_invites
  for each row execute function public.set_updated_at();
