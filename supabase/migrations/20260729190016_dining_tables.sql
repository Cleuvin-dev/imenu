-- Fase 4 — Mesas, QR e cardápio público.
-- dining_tables (docs/07 §5). O token nunca deve aparecer em resposta
-- pública nem em log — só é lido por staff autenticado via RLS abaixo; o
-- cardápio público valida o token através da RPC get_public_menu, que nunca
-- devolve o token de volta ao cliente.

create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments (id) on delete cascade,
  name varchar(60) not null check (length(trim(name)) > 0),
  public_token text not null default encode(gen_random_bytes(24), 'hex'),
  token_version integer not null default 1,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dining_tables_establishment_name_key unique (establishment_id, name),
  constraint dining_tables_public_token_key unique (public_token)
);

create index dining_tables_establishment_token_idx
  on public.dining_tables (establishment_id, public_token);

create index dining_tables_establishment_active_sort_idx
  on public.dining_tables (establishment_id, is_active, sort_order);

create trigger dining_tables_set_updated_at
  before update on public.dining_tables
  for each row execute function public.set_updated_at();

alter table public.dining_tables enable row level security;
alter table public.dining_tables force row level security;

create policy dining_tables_select_staff_or_platform_admin
  on public.dining_tables for select to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'cashier', 'viewer']::public.member_role[])
    or public.is_platform_admin(null)
  );

create policy dining_tables_insert_owner_manager
  on public.dining_tables for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy dining_tables_update_owner_manager
  on public.dining_tables for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy dining_tables_delete_owner_manager
  on public.dining_tables for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );
