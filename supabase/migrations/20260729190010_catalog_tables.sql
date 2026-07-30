-- Fase 3 — Catálogo e mídias.
-- Tabelas de categorias, produtos, opções e horários (docs/07 §4).

create type public.product_status as enum (
  'draft',
  'published',
  'archived'
);

create type public.media_kind as enum (
  'image',
  'video'
);

-- categories ----------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name varchar(80) not null check (length(trim(name)) > 0),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index categories_establishment_active_sort_idx
  on public.categories (establishment_id, is_active, sort_order);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- products --------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  name varchar(120) not null check (length(trim(name)) > 0),
  slug varchar(160) not null,
  short_description varchar(240),
  description varchar(2000),
  ingredients text[] not null default '{}',
  allergens text[] not null default '{}',
  nutrition jsonb,
  base_price_cents integer not null check (base_price_cents >= 0),
  status public.product_status not null default 'draft',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_establishment_slug_key unique (establishment_id, slug),
  constraint products_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create index products_establishment_status_available_category_sort_idx
  on public.products (establishment_id, status, is_available, category_id, sort_order);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Garante que a categoria de um produto pertence ao mesmo estabelecimento.
create or replace function public.enforce_product_category_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_category_establishment_id uuid;
begin
  select establishment_id into v_category_establishment_id
  from public.categories
  where id = new.category_id;

  if v_category_establishment_id is distinct from new.establishment_id then
    raise exception 'products_category_tenant_guard: categoria pertence a outro estabelecimento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger products_category_tenant_guard
  before insert or update of category_id, establishment_id on public.products
  for each row execute function public.enforce_product_category_tenant();

-- product_media ---------------------------------------------------------

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  kind public.media_kind not null,
  storage_path text not null,
  poster_path text,
  alt_text varchar(200),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_media_storage_path_key unique (storage_path)
);

create index product_media_product_sort_idx on public.product_media (product_id, sort_order);

create unique index product_media_one_primary_per_product
  on public.product_media (product_id)
  where is_primary;

create trigger product_media_set_updated_at
  before update on public.product_media
  for each row execute function public.set_updated_at();

create or replace function public.enforce_product_media_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_product_establishment_id uuid;
begin
  select establishment_id into v_product_establishment_id
  from public.products
  where id = new.product_id;

  if v_product_establishment_id is distinct from new.establishment_id then
    raise exception 'product_media_tenant_guard: produto pertence a outro estabelecimento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_media_tenant_guard
  before insert or update of product_id, establishment_id on public.product_media
  for each row execute function public.enforce_product_media_tenant();

-- option_groups -----------------------------------------------------------

create table public.option_groups (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name varchar(80) not null check (length(trim(name)) > 0),
  min_select integer not null default 0 check (min_select >= 0),
  max_select integer not null check (max_select >= 1),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint option_groups_min_max_check check (max_select >= min_select)
);

create index option_groups_establishment_active_sort_idx
  on public.option_groups (establishment_id, is_active, sort_order);

create trigger option_groups_set_updated_at
  before update on public.option_groups
  for each row execute function public.set_updated_at();

-- options -----------------------------------------------------------------

create table public.options (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  option_group_id uuid not null references public.option_groups (id) on delete cascade,
  name varchar(120) not null check (length(trim(name)) > 0),
  price_delta_cents integer not null default 0 check (price_delta_cents >= 0),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index options_group_sort_idx on public.options (option_group_id, sort_order);

create trigger options_set_updated_at
  before update on public.options
  for each row execute function public.set_updated_at();

create or replace function public.enforce_option_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_group_establishment_id uuid;
begin
  select establishment_id into v_group_establishment_id
  from public.option_groups
  where id = new.option_group_id;

  if v_group_establishment_id is distinct from new.establishment_id then
    raise exception 'options_tenant_guard: grupo de opções pertence a outro estabelecimento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger options_tenant_guard
  before insert or update of option_group_id, establishment_id on public.options
  for each row execute function public.enforce_option_tenant();

-- product_option_groups -----------------------------------------------------

create table public.product_option_groups (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  option_group_id uuid not null references public.option_groups (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_option_groups_unique unique (product_id, option_group_id)
);

create index product_option_groups_product_sort_idx
  on public.product_option_groups (product_id, sort_order);

create or replace function public.enforce_product_option_group_tenant()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_product_establishment_id uuid;
  v_group_establishment_id uuid;
begin
  select establishment_id into v_product_establishment_id from public.products where id = new.product_id;
  select establishment_id into v_group_establishment_id from public.option_groups where id = new.option_group_id;

  if v_product_establishment_id is distinct from new.establishment_id
     or v_group_establishment_id is distinct from new.establishment_id then
    raise exception 'product_option_groups_tenant_guard: produto e grupo devem pertencer ao mesmo estabelecimento'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger product_option_groups_tenant_guard
  before insert or update on public.product_option_groups
  for each row execute function public.enforce_product_option_group_tenant();

-- business_hours ------------------------------------------------------------

create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hours_establishment_weekday_key unique (establishment_id, weekday),
  constraint business_hours_window_check check (
    is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

create trigger business_hours_set_updated_at
  before update on public.business_hours
  for each row execute function public.set_updated_at();

-- business_hour_exceptions ---------------------------------------------------

create table public.business_hour_exceptions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  date date not null,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_hour_exceptions_establishment_date_key unique (establishment_id, date),
  constraint business_hour_exceptions_window_check check (
    is_closed or (opens_at is not null and closes_at is not null and closes_at > opens_at)
  )
);

create trigger business_hour_exceptions_set_updated_at
  before update on public.business_hour_exceptions
  for each row execute function public.set_updated_at();
