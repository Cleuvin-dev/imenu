-- Fase 1 — Helpers de autorização usados pelas políticas RLS.
-- SECURITY DEFINER + dono da migração (bypassa RLS internamente) evita
-- recursão ao consultar establishment_members/platform_admins a partir de
-- políticas dessas mesmas tabelas. auth.uid() não muda com SECURITY DEFINER,
-- então o resultado continua correto para o usuário autenticado da sessão.

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
      and m.user_id = auth.uid()
      and m.is_active
  );
$$;

revoke all on function public.is_active_member(uuid) from public;
grant execute on function public.is_active_member(uuid) to authenticated;

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
      and m.user_id = auth.uid()
      and m.is_active
      and m.role = any(allowed_roles)
  );
$$;

revoke all on function public.has_tenant_role(uuid, public.member_role[]) from public;
grant execute on function public.has_tenant_role(uuid, public.member_role[]) to authenticated;

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
    where pa.user_id = auth.uid()
      and pa.is_active
      and (allowed_roles is null or pa.role = any(allowed_roles))
  );
$$;

revoke all on function public.is_platform_admin(public.platform_role[]) from public;
grant execute on function public.is_platform_admin(public.platform_role[]) to authenticated;
