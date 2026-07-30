-- Fase 5 — get_public_order: leitura pública do rastreamento do pedido
-- (docs/08 §2 GET /api/public/orders/{trackingToken}). O token já é o
-- HMAC calculado em Node (ver create_public_order); aqui é só comparação de
-- igualdade. Fail-closed: token desconhecido devolve {valid:false}, nunca
-- revela se o pedido existe (mesmo padrão do get_public_menu).
create or replace function public.get_public_order(p_tracking_token_hash text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_table_name text;
begin
  select * into v_order from public.orders where public_tracking_token_hash = p_tracking_token_hash;
  if not found then
    return jsonb_build_object('valid', false);
  end if;

  select name into v_table_name from public.dining_tables where id = v_order.table_id;

  return jsonb_build_object(
    'valid', true,
    'order', jsonb_build_object(
      'number', v_order.order_number,
      'status', v_order.status,
      'totalCents', v_order.total_cents,
      'currency', v_order.currency,
      'createdAt', v_order.created_at,
      'tableName', v_table_name,
      'rejectionReason', v_order.rejection_reason,
      'cancellationReason', v_order.cancellation_reason,
      'items', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object(
              'name', oi.product_name_snapshot,
              'quantity', oi.quantity,
              'notes', oi.notes,
              'unitTotalCents', oi.unit_total_cents,
              'lineTotalCents', oi.line_total_cents,
              'options', (
                select coalesce(
                  jsonb_agg(
                    jsonb_build_object(
                      'groupName', oio.group_name_snapshot,
                      'optionName', oio.option_name_snapshot,
                      'priceDeltaCents', oio.unit_price_delta_cents
                    )
                  ),
                  '[]'::jsonb
                )
                from public.order_item_options oio
                where oio.order_item_id = oi.id
              )
            )
          ),
          '[]'::jsonb
        )
        from public.order_items oi
        where oi.order_id = v_order.id
      ),
      'timeline', (
        select coalesce(
          jsonb_agg(
            jsonb_build_object('toStatus', h.to_status, 'createdAt', h.created_at)
            order by h.created_at
          ),
          '[]'::jsonb
        )
        from public.order_status_history h
        where h.order_id = v_order.id
      )
    )
  );
end;
$$;

revoke all on function public.get_public_order(text) from public, authenticated;
grant execute on function public.get_public_order(text) to anon;
