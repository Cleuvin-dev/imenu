-- Fase 7 — funções transacionais de conta e fechamento de mesa.

-- request_table_bill: RPC pública (docs/08 §2 POST /api/public/bill-requests).
-- Idempotente por sessão, não por client_request_id: no máximo uma
-- solicitação ativa por sessão (docs/03 §regra 5) — uma segunda chamada de
-- qualquer dispositivo da mesma mesa devolve a solicitação já existente em
-- vez de criar outra (dispositivos diferentes podem contribuir para a
-- mesma sessão, docs/03 §regra 2).
create or replace function public.request_table_bill(
  p_table_token text,
  p_guest_token_hash text,
  p_client_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_table record;
  v_establishment record;
  v_access jsonb;
  v_session_id uuid;
  v_guest_session jsonb;
  v_guest_session_id uuid;
  v_existing_bill_id uuid;
begin
  select id, is_active, establishment_id into v_table
    from public.dining_tables
    where public_token = p_table_token;

  if not found or not v_table.is_active then
    raise exception 'request_table_bill: mesa ou estabelecimento inválido' using errcode = 'IM001';
  end if;

  select id, is_active into v_establishment
    from public.establishments
    where id = v_table.establishment_id;

  if not found or not v_establishment.is_active then
    raise exception 'request_table_bill: mesa ou estabelecimento inválido' using errcode = 'IM001';
  end if;

  v_access := public.evaluate_establishment_access(v_establishment.id);
  if not (v_access ->> 'allowed')::boolean then
    raise exception 'request_table_bill: estabelecimento suspenso' using errcode = 'IM003';
  end if;

  select id into v_session_id
    from public.table_service_sessions
    where table_id = v_table.id and status = 'open'
    for update;

  if not found then
    raise exception 'request_table_bill: nenhuma sessão aberta nesta mesa' using errcode = 'IM011';
  end if;

  v_guest_session := public.ensure_guest_session(
    v_establishment.id, v_table.id, p_guest_token_hash, now() + interval '12 hours'
  );
  v_guest_session_id := (v_guest_session ->> 'sessionId')::uuid;

  select id into v_existing_bill_id
    from public.bill_requests
    where table_service_session_id = v_session_id
      and status in ('requested', 'acknowledged', 'bill_delivered')
    for update;

  if not found then
    insert into public.bill_requests (
      establishment_id, table_id, table_service_session_id, requested_by_guest_session_id, client_request_id
    ) values (
      v_establishment.id, v_table.id, v_session_id, v_guest_session_id, p_client_request_id
    );
  end if;

  return public.get_table_bill_status(p_table_token);
end;
$$;

revoke all on function public.request_table_bill(text, text, uuid) from public, authenticated;
grant execute on function public.request_table_bill(text, text, uuid) to anon;

-- get_table_bill_status: leitura pública fail-closed (docs/08 §2, mesmo
-- padrão de get_public_order). Sempre olha a sessão MAIS RECENTE da mesa
-- (aberta ou já fechada), para que a página do consumidor continue
-- mostrando "Atendida" logo depois do caixa fechar, em vez de sumir.
create or replace function public.get_table_bill_status(p_table_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_table record;
  v_session record;
  v_bill record;
  v_total_cents integer;
begin
  select id, establishment_id into v_table
    from public.dining_tables where public_token = p_table_token;

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select id, status into v_session
    from public.table_service_sessions
    where table_id = v_table.id
    order by opened_at desc
    limit 1;

  if not found then
    return jsonb_build_object('valid', true, 'session', null);
  end if;

  select coalesce(sum(total_cents), 0) into v_total_cents
    from public.orders
    where table_service_session_id = v_session.id
      and status not in ('rejected', 'canceled');

  select * into v_bill
    from public.bill_requests
    where table_service_session_id = v_session.id
    order by created_at desc
    limit 1;

  return jsonb_build_object(
    'valid', true,
    'session', jsonb_build_object(
      'status', v_session.status,
      'totalCents', v_total_cents,
      'billRequest', case when v_bill.id is null then null else jsonb_build_object(
        'status', v_bill.status,
        'requestedAt', v_bill.requested_at,
        'cancellationReason', v_bill.cancellation_reason
      ) end
    )
  );
end;
$$;

revoke all on function public.get_table_bill_status(text) from public, authenticated;
grant execute on function public.get_table_bill_status(text) to anon;

-- transition_bill_request_status: só acknowledged/bill_delivered/canceled —
-- fechar sessão é uma ação própria (close_table_session), não uma
-- transição de bill_request, porque nem toda mesa que fecha passou por uma
-- solicitação de conta formal (docs/04 O-04 lista "fechar sessão" como ação
-- irmã, não subordinada a "marcar entregue").
create or replace function public.transition_bill_request_status(
  p_bill_request_id uuid,
  p_to_status public.bill_request_status,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bill record;
  v_allowed_roles public.member_role[] := array['owner', 'manager', 'cashier']::public.member_role[];
  v_requires_reason boolean := false;
begin
  select * into v_bill from public.bill_requests where id = p_bill_request_id for update;
  if not found then
    raise exception 'transition_bill_request_status: solicitação não encontrada' using errcode = 'P0002';
  end if;

  if v_bill.status = p_to_status then
    -- idempotente: repetir a mesma transição não duplica nada.
    return jsonb_build_object('billRequestId', v_bill.id, 'status', v_bill.status);
  end if;

  case
    when v_bill.status = 'requested' and p_to_status = 'acknowledged' then null;
    when v_bill.status = 'acknowledged' and p_to_status = 'bill_delivered' then null;
    when v_bill.status = 'requested' and p_to_status = 'canceled' then v_requires_reason := true;
    when v_bill.status = 'acknowledged' and p_to_status = 'canceled' then v_requires_reason := true;
    else
      raise exception 'transition_bill_request_status: transição % -> % não permitida', v_bill.status, p_to_status
        using errcode = 'IM010';
  end case;

  if not public.has_tenant_role(v_bill.establishment_id, v_allowed_roles) then
    raise exception 'transition_bill_request_status: papel insuficiente' using errcode = '42501';
  end if;

  if v_requires_reason and (p_reason is null or length(trim(p_reason)) = 0) then
    raise exception 'transition_bill_request_status: motivo é obrigatório para cancelar' using errcode = 'IM009';
  end if;

  update public.bill_requests
    set status = p_to_status,
        handled_by = auth.uid(),
        cancellation_reason = case when p_to_status = 'canceled' then p_reason else cancellation_reason end,
        acknowledged_at = case when p_to_status = 'acknowledged' then now() else acknowledged_at end,
        bill_delivered_at = case when p_to_status = 'bill_delivered' then now() else bill_delivered_at end,
        canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
    where id = p_bill_request_id;

  return jsonb_build_object('billRequestId', p_bill_request_id, 'status', p_to_status);
end;
$$;

revoke all on function public.transition_bill_request_status(uuid, public.bill_request_status, text) from public, anon;
grant execute on function public.transition_bill_request_status(uuid, public.bill_request_status, text) to authenticated;

-- close_table_session: fecha a sessão da mesa (docs/03 §regras 7-8, docs/05
-- §"Fechar a conta fecha a table_service_session"). Bloqueia se houver
-- pedido não terminal, a menos que owner/manager confirme explicitamente
-- (p_force = true) — nesse caso audita (docs/05: "exigir confirmação
-- explícita de gerente/owner com auditoria"). Fecha também a solicitação de
-- conta ativa, se existir, como efeito colateral.
create or replace function public.close_table_session(
  p_table_service_session_id uuid,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_session record;
  v_open_orders integer;
  v_bill record;
begin
  select * into v_session from public.table_service_sessions where id = p_table_service_session_id for update;
  if not found then
    raise exception 'close_table_session: sessão não encontrada' using errcode = 'P0002';
  end if;

  if v_session.status <> 'open' then
    return jsonb_build_object('sessionId', v_session.id, 'status', v_session.status);
  end if;

  if not public.has_tenant_role(v_session.establishment_id, array['owner', 'manager', 'cashier']::public.member_role[]) then
    raise exception 'close_table_session: papel insuficiente' using errcode = '42501';
  end if;

  select count(*) into v_open_orders
    from public.orders
    where table_service_session_id = v_session.id
      and status not in ('delivered', 'rejected', 'canceled');

  if v_open_orders > 0 then
    if not p_force then
      raise exception 'close_table_session: há % pedido(s) não finalizado(s)', v_open_orders using errcode = 'IM013';
    end if;

    if not public.has_tenant_role(v_session.establishment_id, array['owner', 'manager']::public.member_role[]) then
      raise exception 'close_table_session: só owner/manager pode forçar o fechamento com pedidos em aberto'
        using errcode = '42501';
    end if;

    insert into public.audit_logs (actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, after_data)
    values (
      auth.uid(), 'establishment', v_session.establishment_id, 'table_session.force_close_with_open_orders',
      'table_service_session', v_session.id::text, jsonb_build_object('open_orders', v_open_orders)
    );
  end if;

  update public.table_service_sessions
    set status = 'closed', closed_at = now(), closed_by = auth.uid()
    where id = v_session.id;

  select * into v_bill
    from public.bill_requests
    where table_service_session_id = v_session.id
      and status in ('requested', 'acknowledged', 'bill_delivered')
    for update;

  if found then
    update public.bill_requests
      set status = 'closed', closed_at = now(), handled_by = auth.uid()
      where id = v_bill.id;
  end if;

  return jsonb_build_object('sessionId', v_session.id, 'status', 'closed');
end;
$$;

revoke all on function public.close_table_session(uuid, boolean) from public, anon;
grant execute on function public.close_table_session(uuid, boolean) to authenticated;
