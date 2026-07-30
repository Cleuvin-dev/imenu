-- Fase 2 — Funções transacionais de cobrança (docs/07 §10, docs/09).
-- Todas security definer, search_path fixo, validam o chamador internamente
-- quando privilegiadas. Por padrão o Supabase concede EXECUTE a anon,
-- authenticated e service_role em funções novas — por isso revogamos
-- explicitamente dos papéis que não devem chamar cada função.

-- evaluate_establishment_access: RPC pública de leitura limitada usada pelo
-- gate de assinatura (cardápio público e painéis operacionais). Não expõe
-- tabelas de cobrança diretamente, só a decisão.
create or replace function public.evaluate_establishment_access(p_establishment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_establishment record;
  v_subscription record;
begin
  select is_active, manual_suspended_at, manual_suspension_reason
    into v_establishment
    from public.establishments
    where id = p_establishment_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'not_found');
  end if;

  if not v_establishment.is_active then
    return jsonb_build_object('allowed', false, 'reason', 'inactive');
  end if;

  if v_establishment.manual_suspended_at is not null then
    return jsonb_build_object('allowed', false, 'reason', v_establishment.manual_suspension_reason::text);
  end if;

  select status, grace_until
    into v_subscription
    from public.subscriptions
    where establishment_id = p_establishment_id;

  if not found then
    return jsonb_build_object('allowed', false, 'reason', 'no_subscription');
  end if;

  if v_subscription.status = 'suspended' then
    return jsonb_build_object('allowed', false, 'reason', 'overdue');
  end if;

  if v_subscription.status = 'canceled' then
    return jsonb_build_object('allowed', false, 'reason', 'canceled');
  end if;

  return jsonb_build_object('allowed', true, 'reason', null);
end;
$$;

-- process_overdue_subscriptions: só o job de cron (via cliente service role)
-- deve chamar; nunca anon/authenticated.
create or replace function public.process_overdue_subscriptions(p_now timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lock_acquired boolean;
  v_invoices_overdue integer := 0;
  v_subscriptions_past_due integer := 0;
  v_subscriptions_suspended integer := 0;
  v_sub record;
begin
  v_lock_acquired := pg_try_advisory_xact_lock(hashtext('imenu_process_overdue_subscriptions'));
  if not v_lock_acquired then
    return jsonb_build_object(
      'locked', true,
      'invoices_marked_overdue', 0,
      'subscriptions_marked_past_due', 0,
      'subscriptions_suspended', 0
    );
  end if;

  update public.invoices
    set status = 'overdue'
    where status = 'open'
      and due_at < p_now;
  get diagnostics v_invoices_overdue = row_count;

  for v_sub in
    select s.id, s.establishment_id, s.status
    from public.subscriptions s
    where s.status in ('trialing', 'active')
      and exists (
        select 1 from public.invoices i
        where i.subscription_id = s.id and i.status = 'overdue'
      )
  loop
    update public.subscriptions set status = 'past_due' where id = v_sub.id;

    insert into public.subscription_events (establishment_id, subscription_id, from_status, to_status, event, reason)
    values (v_sub.establishment_id, v_sub.id, v_sub.status, 'past_due', 'overdue_detected', 'Fatura vencida sem pagamento');

    v_subscriptions_past_due := v_subscriptions_past_due + 1;
  end loop;

  for v_sub in
    select s.id, s.establishment_id
    from public.subscriptions s
    where s.status = 'past_due'
      and (s.grace_until is null or s.grace_until <= p_now)
      and exists (
        select 1 from public.invoices i
        where i.subscription_id = s.id and i.status = 'overdue'
      )
  loop
    update public.subscriptions
      set status = 'suspended', suspended_at = p_now, suspension_reason = 'overdue'
      where id = v_sub.id;

    insert into public.subscription_events (establishment_id, subscription_id, from_status, to_status, event, reason)
    values (v_sub.establishment_id, v_sub.id, 'past_due', 'suspended', 'suspended', 'Fatura vencida sem prazo adicional vigente');

    insert into public.audit_logs (actor_scope, establishment_id, action, resource_type, resource_id, after_data)
    values ('system', v_sub.establishment_id, 'subscription.suspend', 'subscription', v_sub.id::text, jsonb_build_object('reason', 'overdue'));

    v_subscriptions_suspended := v_subscriptions_suspended + 1;
  end loop;

  return jsonb_build_object(
    'locked', false,
    'invoices_marked_overdue', v_invoices_overdue,
    'subscriptions_marked_past_due', v_subscriptions_past_due,
    'subscriptions_suspended', v_subscriptions_suspended
  );
end;
$$;

revoke execute on function public.process_overdue_subscriptions(timestamptz) from anon, authenticated;

-- confirm_invoice_payment: só platform admin; valida internamente.
create or replace function public.confirm_invoice_payment(
  p_invoice_id uuid,
  p_amount_cents integer,
  p_paid_at timestamptz,
  p_method public.payment_method,
  p_reference text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invoice record;
  v_subscription record;
  v_has_other_overdue boolean;
  v_payment_id uuid;
  v_new_sub_status public.subscription_status;
begin
  if not public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]) then
    raise exception 'confirm_invoice_payment: apenas administradores da plataforma podem confirmar pagamentos'
      using errcode = '42501';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'confirm_invoice_payment: fatura não encontrada' using errcode = 'P0002';
  end if;

  if v_invoice.status not in ('open', 'overdue') then
    raise exception 'confirm_invoice_payment: fatura já está em status %', v_invoice.status
      using errcode = '22023';
  end if;

  if p_amount_cents <> v_invoice.amount_cents then
    raise exception 'confirm_invoice_payment: valor informado (%) difere do valor da fatura (%)', p_amount_cents, v_invoice.amount_cents
      using errcode = '22023';
  end if;

  select * into v_subscription from public.subscriptions where id = v_invoice.subscription_id for update;

  insert into public.payments (
    establishment_id, invoice_id, amount_cents, status, method, paid_at, reference, note, recorded_by
  ) values (
    v_invoice.establishment_id, v_invoice.id, p_amount_cents, 'confirmed', p_method, p_paid_at, p_reference, p_note, auth.uid()
  ) returning id into v_payment_id;

  update public.invoices set status = 'paid', paid_at = p_paid_at where id = v_invoice.id;

  select exists (
    select 1 from public.invoices
    where subscription_id = v_subscription.id and status = 'overdue' and id <> v_invoice.id
  ) into v_has_other_overdue;

  v_new_sub_status := v_subscription.status;

  if not v_has_other_overdue and (v_subscription.suspension_reason is null or v_subscription.suspension_reason = 'overdue') then
    v_new_sub_status := 'active';
    update public.subscriptions
      set status = 'active', suspended_at = null, suspension_reason = null, suspension_note = null
      where id = v_subscription.id;
  end if;

  insert into public.subscription_events (establishment_id, subscription_id, from_status, to_status, event, reason, actor_user_id, metadata)
  values (
    v_invoice.establishment_id, v_subscription.id, v_subscription.status, v_new_sub_status, 'payment_confirmed',
    'Pagamento confirmado para a fatura ' || v_invoice.id::text, auth.uid(),
    jsonb_build_object('invoice_id', v_invoice.id, 'payment_id', v_payment_id, 'amount_cents', p_amount_cents)
  );

  insert into public.audit_logs (actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, before_data, after_data)
  values (
    auth.uid(), 'platform', v_invoice.establishment_id, 'payment.confirm', 'invoice', v_invoice.id::text,
    jsonb_build_object('status', v_invoice.status),
    jsonb_build_object('status', 'paid', 'payment_id', v_payment_id, 'amount_cents', p_amount_cents, 'method', p_method)
  );

  return jsonb_build_object(
    'invoice_id', v_invoice.id,
    'payment_id', v_payment_id,
    'subscription_status', v_new_sub_status
  );
end;
$$;

revoke execute on function public.confirm_invoice_payment(uuid, integer, timestamptz, public.payment_method, text, text) from anon;

-- reverse_payment: só platform admin; nunca apaga o pagamento, reabre a fatura.
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment record;
  v_invoice record;
  v_subscription record;
  v_new_invoice_status public.invoice_status;
  v_new_sub_status public.subscription_status;
begin
  if not public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]) then
    raise exception 'reverse_payment: apenas administradores da plataforma podem estornar pagamentos'
      using errcode = '42501';
  end if;

  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'reverse_payment: motivo é obrigatório' using errcode = '22023';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'reverse_payment: pagamento não encontrado' using errcode = 'P0002';
  end if;
  if v_payment.status = 'reversed' then
    raise exception 'reverse_payment: pagamento já foi estornado' using errcode = '22023';
  end if;

  select * into v_invoice from public.invoices where id = v_payment.invoice_id for update;
  select * into v_subscription from public.subscriptions where id = v_invoice.subscription_id for update;

  update public.payments
    set status = 'reversed', reversed_at = now(), reversed_by = auth.uid(), reversal_reason = p_reason
    where id = v_payment.id;

  v_new_invoice_status := case when v_invoice.due_at < now() then 'overdue' else 'open' end;

  update public.invoices
    set status = v_new_invoice_status, paid_at = null
    where id = v_invoice.id;

  v_new_sub_status := v_subscription.status;
  if v_new_invoice_status = 'overdue' and v_subscription.status not in ('suspended', 'canceled') then
    v_new_sub_status := 'past_due';
    update public.subscriptions set status = 'past_due' where id = v_subscription.id;
  end if;

  insert into public.subscription_events (establishment_id, subscription_id, from_status, to_status, event, reason, actor_user_id, metadata)
  values (
    v_invoice.establishment_id, v_subscription.id, v_subscription.status, v_new_sub_status, 'payment_reversed',
    p_reason, auth.uid(), jsonb_build_object('invoice_id', v_invoice.id, 'payment_id', v_payment.id)
  );

  insert into public.audit_logs (actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, before_data, after_data)
  values (
    auth.uid(), 'platform', v_invoice.establishment_id, 'payment.reverse', 'payment', v_payment.id::text,
    jsonb_build_object('status', 'confirmed'),
    jsonb_build_object('status', 'reversed', 'reason', p_reason)
  );

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'invoice_status', v_new_invoice_status,
    'subscription_status', v_new_sub_status
  );
end;
$$;

revoke execute on function public.reverse_payment(uuid, text) from anon;
