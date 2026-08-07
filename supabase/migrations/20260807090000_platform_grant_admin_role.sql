-- Fase 8 (extensão) — permite ao super admin cadastrar diretamente a conta
-- de um novo administrador da plataforma (docs/03 RF-ADM-014), em vez de
-- exigir que a pessoa já tenha feito login antes. Mesmo padrão de
-- platform_bootstrap_establishment: a conta em auth.users é criada pela
-- camada de aplicação via supabase.auth.admin.createUser (exige
-- SUPABASE_SERVICE_ROLE_KEY) antes de chamar esta função, que só grava o
-- papel em platform_admins e o registro de auditoria — ambos exigidos pelas
-- regras técnicas inegociáveis (auditoria de toda ação sensível do
-- superadmin). p_actor_user_id é só para registro, a autorização
-- (requirePlatformAdmin(["super_admin"])) acontece antes, na aplicação.
create or replace function public.platform_grant_admin_role(
  p_user_id uuid,
  p_actor_user_id uuid,
  p_role public.platform_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.platform_admins (user_id, role, is_active, created_by)
  values (p_user_id, p_role, true, p_actor_user_id)
  on conflict (user_id) do update set role = excluded.role, is_active = true;

  insert into public.audit_logs (
    actor_user_id, actor_scope, action, resource_type, resource_id, after_data
  ) values (
    p_actor_user_id, 'platform', 'platform_admin.grant_role', 'platform_admin',
    p_user_id::text, jsonb_build_object('role', p_role, 'user_id', p_user_id)
  );
end;
$$;

revoke all on function public.platform_grant_admin_role(uuid, uuid, public.platform_role)
  from public, anon, authenticated;
