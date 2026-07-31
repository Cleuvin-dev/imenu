-- Fase 7 — correção: get_table_bill_status não devolvia o nome do
-- estabelecimento/mesa, necessário para o cabeçalho de /m/.../conta.
create or replace function public.get_table_bill_status(p_table_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_table record;
  v_establishment record;
  v_session record;
  v_bill record;
  v_total_cents integer;
begin
  select id, name, establishment_id into v_table
    from public.dining_tables where public_token = p_table_token;

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select trade_name into v_establishment
    from public.establishments where id = v_table.establishment_id;

  select id, status into v_session
    from public.table_service_sessions
    where table_id = v_table.id
    order by opened_at desc
    limit 1;

  if not found then
    return jsonb_build_object(
      'valid', true,
      'establishmentTradeName', v_establishment.trade_name,
      'tableName', v_table.name,
      'session', null
    );
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
    'establishmentTradeName', v_establishment.trade_name,
    'tableName', v_table.name,
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
