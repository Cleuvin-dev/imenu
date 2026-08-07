-- RF-ADM-010 (suspender/reativar manualmente com motivo) — as colunas
-- establishments.manual_suspended_at/manual_suspension_reason já existiam
-- desde a Fase 1 e já eram lidas por evaluate_establishment_access, mas
-- nenhum código de aplicação as escrevia (ver D-036: escopo deixado de fora
-- da Fase 8 de propósito). O responsável pediu, dentro do painel de
-- Administração geral, controle para suspender/reativar um estabelecimento
-- preservando os dados (docs/03 RF-ADM-013) em vez de excluir de verdade.
-- Mesmo padrão de confirm_invoice_payment/reverse_payment: a autorização é
-- checada dentro da função via is_platform_admin(), chamável por
-- `authenticated` (o RLS de establishments não libera update desse campo
-- para o papel do estabelecimento, só para platform admin).
create or replace function public.platform_suspend_establishment(
  p_establishment_id uuid,
  p_reason public.suspension_reason
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before record;
begin
  if not public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]) then
    raise exception 'platform_suspend_establishment: apenas administradores da plataforma podem suspender'
      using errcode = '42501';
  end if;

  select manual_suspended_at, manual_suspension_reason into v_before
    from public.establishments where id = p_establishment_id for update;
  if not found then
    raise exception 'platform_suspend_establishment: estabelecimento não encontrado' using errcode = 'P0002';
  end if;

  update public.establishments
    set manual_suspended_at = now(), manual_suspension_reason = p_reason
    where id = p_establishment_id;

  insert into public.audit_logs (
    actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, before_data, after_data
  ) values (
    auth.uid(), 'platform', p_establishment_id, 'establishment.manual_suspend', 'establishment', p_establishment_id::text,
    jsonb_build_object('manual_suspended_at', v_before.manual_suspended_at, 'manual_suspension_reason', v_before.manual_suspension_reason),
    jsonb_build_object('manual_suspended_at', now(), 'manual_suspension_reason', p_reason)
  );
end;
$$;

create or replace function public.platform_reactivate_establishment(
  p_establishment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_before record;
begin
  if not public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]) then
    raise exception 'platform_reactivate_establishment: apenas administradores da plataforma podem reativar'
      using errcode = '42501';
  end if;

  select manual_suspended_at, manual_suspension_reason into v_before
    from public.establishments where id = p_establishment_id for update;
  if not found then
    raise exception 'platform_reactivate_establishment: estabelecimento não encontrado' using errcode = 'P0002';
  end if;
  if v_before.manual_suspended_at is null then
    raise exception 'platform_reactivate_establishment: estabelecimento não está suspenso manualmente' using errcode = '22023';
  end if;

  update public.establishments
    set manual_suspended_at = null, manual_suspension_reason = null
    where id = p_establishment_id;

  insert into public.audit_logs (
    actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, before_data, after_data
  ) values (
    auth.uid(), 'platform', p_establishment_id, 'establishment.manual_reactivate', 'establishment', p_establishment_id::text,
    jsonb_build_object('manual_suspended_at', v_before.manual_suspended_at, 'manual_suspension_reason', v_before.manual_suspension_reason),
    jsonb_build_object('manual_suspended_at', null, 'manual_suspension_reason', null)
  );
end;
$$;

revoke all on function public.platform_suspend_establishment(uuid, public.suspension_reason) from public;
grant execute on function public.platform_suspend_establishment(uuid, public.suspension_reason) to authenticated;

revoke all on function public.platform_reactivate_establishment(uuid) from public;
grant execute on function public.platform_reactivate_establishment(uuid) to authenticated;
