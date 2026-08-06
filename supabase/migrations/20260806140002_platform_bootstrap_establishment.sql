-- Fase 8 — Bootstrap de estabelecimento + owner inicial pelo admin geral
-- (docs/03 RF-ADM-002). Só pode ser chamada pelo cliente service role: o
-- usuário do owner precisa existir antes em auth.users (via
-- supabase.auth.admin.createUser, que exige SUPABASE_SERVICE_ROLE_KEY — ver
-- status/IMPLEMENTATION_STATUS.md), então não há sessão/auth.uid() de
-- convidado disponível aqui. Por isso a autorização (requirePlatformAdmin)
-- acontece inteiramente na camada de aplicação antes de chamar esta função
-- — mesmo padrão já usado por process_overdue_subscriptions (cron), que
-- também roda sob service role sem auth.uid(). p_actor_user_id é só para
-- registro de auditoria, não para autorização.
create or replace function public.platform_bootstrap_establishment(
  p_owner_user_id uuid,
  p_actor_user_id uuid,
  p_legal_name text,
  p_trade_name text,
  p_slug text,
  p_document_number text,
  p_email text,
  p_phone text,
  p_city text,
  p_state_code text,
  p_plan_id uuid,
  p_trial_days integer default 14
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_establishment_id uuid;
  v_subscription_id uuid;
  v_plan record;
  v_period_end timestamptz;
begin
  select * into v_plan from public.plans where id = p_plan_id and is_active;
  if not found then
    raise exception 'platform_bootstrap_establishment: plano não encontrado ou inativo' using errcode = 'P0002';
  end if;

  insert into public.establishments (
    legal_name, trade_name, slug, document_number, email, phone, city, state_code
  ) values (
    p_legal_name, p_trade_name, p_slug, nullif(p_document_number, ''), nullif(p_email, ''),
    nullif(p_phone, ''), nullif(p_city, ''), nullif(p_state_code, '')
  ) returning id into v_establishment_id;

  v_period_end := now() + make_interval(months => v_plan.billing_interval_months);

  insert into public.subscriptions (
    establishment_id, plan_id, status, current_period_start, current_period_end, trial_ends_at
  ) values (
    v_establishment_id, p_plan_id, 'trialing', now(), v_period_end, now() + make_interval(days => p_trial_days)
  ) returning id into v_subscription_id;

  insert into public.subscription_events (
    establishment_id, subscription_id, from_status, to_status, event, reason, actor_user_id
  ) values (
    v_establishment_id, v_subscription_id, null, 'trialing', 'created',
    'Assinatura criada no cadastro do estabelecimento', p_actor_user_id
  );

  insert into public.establishment_members (establishment_id, user_id, role, is_active, invited_by)
  values (v_establishment_id, p_owner_user_id, 'owner', true, p_actor_user_id);

  insert into public.audit_logs (
    actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, after_data
  ) values (
    p_actor_user_id, 'platform', v_establishment_id, 'establishment.bootstrap', 'establishment',
    v_establishment_id::text,
    jsonb_build_object('trade_name', p_trade_name, 'slug', p_slug, 'owner_user_id', p_owner_user_id, 'plan_id', p_plan_id)
  );

  return jsonb_build_object('establishmentId', v_establishment_id, 'slug', p_slug, 'subscriptionId', v_subscription_id);
end;
$$;

revoke all on function public.platform_bootstrap_establishment(
  uuid, uuid, text, text, text, text, text, text, text, text, uuid, integer
) from public, anon, authenticated;
