-- Fase 5 — transition_order_status: máquina de estados do pedido
-- (docs/05 §3, docs/11 AC-ORD-007/008). Valida papel e transição
-- internamente (nunca confia só na checagem do app); idempotente por
-- operation_id — repetir a mesma operação devolve o estado atual sem
-- duplicar histórico.
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to_status public.order_status,
  p_reason text default null,
  p_operation_id uuid default gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_allowed_roles public.member_role[];
  v_requires_reason boolean := false;
  v_existing_history record;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'transition_order_status: pedido não encontrado' using errcode = 'P0002';
  end if;

  select * into v_existing_history
    from public.order_status_history
    where order_id = p_order_id and operation_id = p_operation_id;

  if found then
    return jsonb_build_object('orderId', v_order.id, 'status', v_order.status);
  end if;

  case
    when v_order.status = 'pending' and p_to_status = 'accepted' then
      v_allowed_roles := array['kitchen', 'cashier', 'manager', 'owner']::public.member_role[];
    when v_order.status = 'pending' and p_to_status = 'rejected' then
      v_allowed_roles := array['kitchen', 'cashier', 'manager', 'owner']::public.member_role[];
      v_requires_reason := true;
    when v_order.status = 'pending' and p_to_status = 'canceled' then
      v_allowed_roles := array['cashier', 'manager', 'owner']::public.member_role[];
      v_requires_reason := true;
    when v_order.status = 'accepted' and p_to_status = 'preparing' then
      v_allowed_roles := array['kitchen', 'cashier', 'manager', 'owner']::public.member_role[];
    when v_order.status = 'accepted' and p_to_status = 'canceled' then
      v_allowed_roles := array['cashier', 'manager', 'owner']::public.member_role[];
      v_requires_reason := true;
    when v_order.status = 'preparing' and p_to_status = 'ready' then
      v_allowed_roles := array['kitchen', 'cashier', 'manager', 'owner']::public.member_role[];
    when v_order.status = 'preparing' and p_to_status = 'canceled' then
      v_allowed_roles := array['cashier', 'manager', 'owner']::public.member_role[];
      v_requires_reason := true;
    when v_order.status = 'ready' and p_to_status = 'delivered' then
      v_allowed_roles := array['cashier', 'manager', 'owner']::public.member_role[];
    when v_order.status = 'ready' and p_to_status = 'canceled' then
      v_allowed_roles := array['cashier', 'manager', 'owner']::public.member_role[];
      v_requires_reason := true;
    else
      raise exception 'transition_order_status: transição % -> % não permitida', v_order.status, p_to_status
        using errcode = 'IM010';
  end case;

  if not public.has_tenant_role(v_order.establishment_id, v_allowed_roles) then
    raise exception 'transition_order_status: papel insuficiente para esta transição' using errcode = '42501';
  end if;

  if v_requires_reason and (p_reason is null or length(trim(p_reason)) = 0) then
    raise exception 'transition_order_status: motivo é obrigatório para % -> %', v_order.status, p_to_status
      using errcode = 'IM009';
  end if;

  update public.orders
    set status = p_to_status,
        rejection_reason = case when p_to_status = 'rejected' then p_reason else rejection_reason end,
        cancellation_reason = case when p_to_status = 'canceled' then p_reason else cancellation_reason end,
        accepted_at = case when p_to_status = 'accepted' then now() else accepted_at end,
        preparing_at = case when p_to_status = 'preparing' then now() else preparing_at end,
        ready_at = case when p_to_status = 'ready' then now() else ready_at end,
        delivered_at = case when p_to_status = 'delivered' then now() else delivered_at end,
        rejected_at = case when p_to_status = 'rejected' then now() else rejected_at end,
        canceled_at = case when p_to_status = 'canceled' then now() else canceled_at end
    where id = p_order_id;

  insert into public.order_status_history (
    establishment_id, order_id, from_status, to_status, actor_user_id, reason, operation_id
  ) values (
    v_order.establishment_id, p_order_id, v_order.status, p_to_status, auth.uid(), p_reason, p_operation_id
  );

  return jsonb_build_object('orderId', p_order_id, 'status', p_to_status);
end;
$$;

revoke all on function public.transition_order_status(uuid, public.order_status, text, uuid) from public, anon;
grant execute on function public.transition_order_status(uuid, public.order_status, text, uuid) to authenticated;
