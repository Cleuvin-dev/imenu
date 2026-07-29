-- Fase 1 — Correções apontadas pelo advisor de segurança/performance do
-- Supabase após a aplicação das migrações anteriores:
--  1. mover a extensão citext para fora do schema public;
--  2. impedir chamada direta (RPC) das funções de trigger e restringir o
--     helper de RLS ao papel authenticated;
--  3. usar (select auth.uid()) para evitar reavaliação por linha;
--  4. separar as policies de platform_admins para não duplicar a de SELECT;
--  5. indexar as colunas de FK que ficaram sem índice de cobertura.

create schema if not exists extensions;
alter extension citext set schema extensions;
-- A partir daqui, novas colunas citext devem usar "extensions.citext"
-- explicitamente ou incluir "extensions" no search_path da sessão.

revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.handle_auth_user_email_change() from anon, authenticated;

revoke execute on function public.is_active_member(uuid) from anon;
revoke execute on function public.has_tenant_role(uuid, public.member_role[]) from anon;
revoke execute on function public.is_platform_admin(public.platform_role[]) from anon;

create or replace function public.is_active_member(target_establishment_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.establishment_members m
    where m.establishment_id = target_establishment_id
      and m.user_id = (select auth.uid())
      and m.is_active
  );
$$;

create or replace function public.has_tenant_role(
  target_establishment_id uuid,
  allowed_roles public.member_role[]
)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.establishment_members m
    where m.establishment_id = target_establishment_id
      and m.user_id = (select auth.uid())
      and m.is_active
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.is_platform_admin(allowed_roles public.platform_role[] default null)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.user_id = (select auth.uid())
      and pa.is_active
      and (allowed_roles is null or pa.role = any(allowed_roles))
  );
$$;

-- profiles: evitar reavaliação de auth.uid() por linha ----------------------

drop policy profiles_select_self_or_platform_admin on public.profiles;
create policy profiles_select_self_or_platform_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_platform_admin(null)
  );

drop policy profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- platform_admins: separar SELECT de INSERT/UPDATE/DELETE ------------------

drop policy platform_admins_select_self_or_admin on public.platform_admins;
create policy platform_admins_select_self_or_admin
  on public.platform_admins
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_platform_admin(null)
  );

drop policy platform_admins_manage_by_super_admin on public.platform_admins;

create policy platform_admins_insert_by_super_admin
  on public.platform_admins
  for insert
  to authenticated
  with check (public.is_platform_admin(array['super_admin']::public.platform_role[]));

create policy platform_admins_update_by_super_admin
  on public.platform_admins
  for update
  to authenticated
  using (public.is_platform_admin(array['super_admin']::public.platform_role[]))
  with check (public.is_platform_admin(array['super_admin']::public.platform_role[]));

create policy platform_admins_delete_by_super_admin
  on public.platform_admins
  for delete
  to authenticated
  using (public.is_platform_admin(array['super_admin']::public.platform_role[]));

-- establishment_members: mesma correção de initplan -------------------------

drop policy establishment_members_select_self_member_or_platform_admin on public.establishment_members;
create policy establishment_members_select_self_member_or_platform_admin
  on public.establishment_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );

-- Índices de cobertura para chaves estrangeiras sinalizadas pelo advisor ----

create index establishment_members_invited_by_idx
  on public.establishment_members (invited_by);

create index member_invites_invited_by_idx
  on public.member_invites (invited_by);

create index platform_admins_created_by_idx
  on public.platform_admins (created_by);
