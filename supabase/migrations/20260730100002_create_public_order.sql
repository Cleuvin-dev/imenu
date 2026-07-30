-- Fase 5 — create_public_order: criação transacional do pedido (docs/05 §2,
-- docs/07 §10, docs/08 §2, docs/11 AC-ORD-001 a 006).
--
-- Node computa e envia já prontos (nunca confia no navegador para o total):
--   p_payload_hash        — hash determinístico dos itens validados (Zod),
--                           usado só para detectar payload divergente na
--                           mesma client_request_id (AC-ORD-006).
--   p_tracking_token_hash — HMAC(ORDER_TRACKING_TOKEN_PEPPER, clientRequestId),
--                           calculado em Node (pimenta nunca chega ao banco).
--                           É determinístico: um retry com o mesmo
--                           clientRequestId recalcula o mesmo valor sem
--                           precisar reler o pedido já criado.
--
-- O preço é sempre recalculado aqui a partir do catálogo (nunca a partir do
-- expectedTotalCents do cliente, que só serve para detectar PRICE_CHANGED).
create or replace function public.create_public_order(
  p_establishment_slug text,
  p_table_token text,
  p_guest_token_hash text,
  p_client_request_id uuid,
  p_payload_hash text,
  p_tracking_token_hash text,
  p_expected_total_cents integer,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_establishment record;
  v_table record;
  v_access jsonb;
  v_local_now timestamp;
  v_local_date date;
  v_local_weekday int;
  v_local_time time;
  v_hours record;
  v_is_open boolean;
  v_existing record;
  v_guest_session jsonb;
  v_guest_session_id uuid;
  v_session_id uuid;
  v_item jsonb;
  v_option_ids uuid[];
  v_valid_option_ids uuid[];
  v_product record;
  v_quantity integer;
  v_notes text;
  v_unit_total integer;
  v_subtotal integer := 0;
  v_order_id uuid;
  v_order_item_id uuid;
  v_order_number text;
  v_next_seq integer;
  v_group record;
  v_selected_in_group integer;
  v_option record;
  v_item_option_rows jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_opt jsonb;
begin
  -- 1) Mesa/estabelecimento — mesmo critério não-enumerável do get_public_menu.
  select id, trade_name, slug, timezone, is_active, accepting_orders
    into v_establishment
    from public.establishments
    where slug = p_establishment_slug;

  if not found or not v_establishment.is_active then
    raise exception 'create_public_order: mesa ou estabelecimento inválido' using errcode = 'IM001';
  end if;

  select id, name, is_active
    into v_table
    from public.dining_tables
    where establishment_id = v_establishment.id and public_token = p_table_token;

  if not found or not v_table.is_active then
    raise exception 'create_public_order: mesa ou estabelecimento inválido' using errcode = 'IM001';
  end if;

  -- 2) Assinatura/bloqueio manual (docs/09).
  v_access := public.evaluate_establishment_access(v_establishment.id);
  if not (v_access ->> 'allowed')::boolean then
    raise exception 'create_public_order: estabelecimento suspenso' using errcode = 'IM003';
  end if;

  -- 3) Horário de funcionamento e pausa manual (mesmo cálculo do get_public_menu).
  v_local_now := now() at time zone v_establishment.timezone;
  v_local_date := v_local_now::date;
  v_local_weekday := extract(dow from v_local_now)::int;
  v_local_time := v_local_now::time;

  select is_closed, opens_at, closes_at
    into v_hours
    from public.business_hour_exceptions
    where establishment_id = v_establishment.id and date = v_local_date;

  if not found then
    select is_closed, opens_at, closes_at
      into v_hours
      from public.business_hours
      where establishment_id = v_establishment.id and weekday = v_local_weekday;
  end if;

  if not found then
    v_is_open := true;
  elsif v_hours.is_closed then
    v_is_open := false;
  else
    v_is_open := v_local_time >= v_hours.opens_at and v_local_time < v_hours.closes_at;
  end if;

  if not v_is_open or not v_establishment.accepting_orders then
    raise exception 'create_public_order: fora do horário ou pedidos pausados' using errcode = 'IM004';
  end if;

  -- 4) Idempotência — mesma chave já processada (AC-ORD-005/006).
  select * into v_existing
    from public.orders
    where establishment_id = v_establishment.id and client_request_id = p_client_request_id;

  if found then
    if v_existing.payload_hash <> p_payload_hash then
      raise exception 'create_public_order: client_request_id reutilizado com payload diferente'
        using errcode = 'IM008';
    end if;

    return jsonb_build_object(
      'trackingToken', p_tracking_token_hash,
      'number', v_existing.order_number,
      'status', v_existing.status,
      'totalCents', v_existing.total_cents,
      'currency', v_existing.currency,
      'createdAt', v_existing.created_at
    );
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'create_public_order: pedido sem itens' using errcode = 'IM009';
  end if;

  -- 5) Sessão anônima do consumidor (reaproveita a mesma função da Fase 4).
  v_guest_session := public.ensure_guest_session(
    v_establishment.id, v_table.id, p_guest_token_hash, now() + interval '12 hours'
  );
  v_guest_session_id := (v_guest_session ->> 'sessionId')::uuid;

  -- 6) Sessão de atendimento da mesa — reaproveita a aberta ou cria uma nova.
  select id into v_session_id
    from public.table_service_sessions
    where table_id = v_table.id and status = 'open';

  if not found then
    insert into public.table_service_sessions (establishment_id, table_id)
    values (v_establishment.id, v_table.id)
    returning id into v_session_id;
  end if;

  -- 7) Valida cada item/opção contra o catálogo atual e recalcula o preço.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := (v_item ->> 'quantity')::integer;
    v_notes := nullif(trim(both from (v_item ->> 'notes')), '');

    if v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'create_public_order: quantidade inválida' using errcode = 'IM009';
    end if;

    select p.id, p.name, p.short_description, p.description, p.ingredients, p.allergens,
           p.base_price_cents, p.is_available, p.status, c.is_active as category_is_active
      into v_product
      from public.products p
      join public.categories c on c.id = p.category_id
      where p.id = (v_item ->> 'productId')::uuid and p.establishment_id = v_establishment.id;

    if not found or v_product.status <> 'published' or not v_product.is_available
       or not v_product.category_is_active then
      raise exception 'create_public_order: produto indisponível' using errcode = 'IM005';
    end if;

    select coalesce(array_agg(value::uuid), array[]::uuid[])
      into v_option_ids
      from jsonb_array_elements_text(coalesce(v_item -> 'selectedOptionIds', '[]'::jsonb));

    -- Opções disponíveis deste produto (grupo ativo + opção disponível).
    select coalesce(array_agg(o.id), array[]::uuid[])
      into v_valid_option_ids
      from public.product_option_groups pog
      join public.option_groups og on og.id = pog.option_group_id and og.is_active = true
      join public.options o on o.option_group_id = og.id and o.is_available = true
      where pog.product_id = v_product.id;

    if exists (
      select 1 from unnest(v_option_ids) as sel(id)
      where not (sel.id = any(v_valid_option_ids))
    ) then
      raise exception 'create_public_order: opção indisponível' using errcode = 'IM005';
    end if;

    v_unit_total := v_product.base_price_cents;
    v_item_option_rows := '[]'::jsonb;

    for v_group in
      select og.id, og.name, og.min_select, og.max_select
        from public.product_option_groups pog
        join public.option_groups og on og.id = pog.option_group_id and og.is_active = true
        where pog.product_id = v_product.id
    loop
      select count(*) into v_selected_in_group
        from public.options o
        where o.option_group_id = v_group.id and o.id = any(v_option_ids);

      if v_selected_in_group < v_group.min_select or v_selected_in_group > v_group.max_select then
        raise exception 'create_public_order: seleção de opções inválida para o grupo %', v_group.name
          using errcode = 'IM007';
      end if;

      for v_option in
        select o.id, o.name, o.price_delta_cents
          from public.options o
          where o.option_group_id = v_group.id and o.id = any(v_option_ids)
      loop
        v_unit_total := v_unit_total + v_option.price_delta_cents;
        v_item_option_rows := v_item_option_rows || jsonb_build_array(jsonb_build_object(
          'optionId', v_option.id,
          'groupName', v_group.name,
          'optionName', v_option.name,
          'priceDeltaCents', v_option.price_delta_cents
        ));
      end loop;
    end loop;

    v_subtotal := v_subtotal + (v_unit_total * v_quantity);

    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_product.id,
      'name', v_product.name,
      'quantity', v_quantity,
      'notes', v_notes,
      'unitBasePriceCents', v_product.base_price_cents,
      'unitTotalCents', v_unit_total,
      'lineTotalCents', v_unit_total * v_quantity,
      'options', v_item_option_rows,
      'productSnapshot', jsonb_build_object(
        'name', v_product.name,
        'shortDescription', v_product.short_description,
        'description', v_product.description,
        'ingredients', to_jsonb(v_product.ingredients),
        'allergens', to_jsonb(v_product.allergens),
        'basePriceCents', v_product.base_price_cents
      )
    ));
  end loop;

  -- 8) Preço mudou desde que o consumidor montou o carrinho? Aborta sem criar nada.
  if p_expected_total_cents is not null and p_expected_total_cents <> v_subtotal then
    raise exception 'create_public_order: total mudou' using errcode = 'IM006';
  end if;

  -- 9) Numeração sequencial por estabelecimento/dia, serializada por trava consultiva.
  perform pg_advisory_xact_lock(hashtext(v_establishment.id::text || v_local_date::text));

  select count(*) + 1 into v_next_seq
    from public.orders
    where establishment_id = v_establishment.id and order_business_date = v_local_date;

  v_order_number := 'A' || lpad(v_next_seq::text, 3, '0');

  -- 10) Cria pedido, itens, opções e primeiro histórico — tudo nesta mesma transação.
  insert into public.orders (
    establishment_id, table_id, table_service_session_id, guest_session_id,
    order_number, order_business_date, public_tracking_token_hash,
    client_request_id, payload_hash, status, subtotal_cents, total_cents
  ) values (
    v_establishment.id, v_table.id, v_session_id, v_guest_session_id,
    v_order_number, v_local_date, p_tracking_token_hash,
    p_client_request_id, p_payload_hash, 'pending', v_subtotal, v_subtotal
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    insert into public.order_items (
      establishment_id, order_id, product_id, product_name_snapshot,
      unit_base_price_cents, quantity, notes, unit_total_cents, line_total_cents, product_snapshot
    ) values (
      v_establishment.id, v_order_id, (v_line ->> 'productId')::uuid, v_line ->> 'name',
      (v_line ->> 'unitBasePriceCents')::integer, (v_line ->> 'quantity')::integer, v_line ->> 'notes',
      (v_line ->> 'unitTotalCents')::integer, (v_line ->> 'lineTotalCents')::integer, v_line -> 'productSnapshot'
    ) returning id into v_order_item_id;

    for v_opt in select * from jsonb_array_elements(v_line -> 'options')
    loop
      insert into public.order_item_options (
        establishment_id, order_item_id, option_id, group_name_snapshot, option_name_snapshot,
        unit_price_delta_cents, option_snapshot
      ) values (
        v_establishment.id, v_order_item_id, (v_opt ->> 'optionId')::uuid, v_opt ->> 'groupName',
        v_opt ->> 'optionName', (v_opt ->> 'priceDeltaCents')::integer, v_opt
      );
    end loop;
  end loop;

  insert into public.order_status_history (establishment_id, order_id, from_status, to_status)
  values (v_establishment.id, v_order_id, null, 'pending');

  return jsonb_build_object(
    'trackingToken', p_tracking_token_hash,
    'number', v_order_number,
    'status', 'pending',
    'totalCents', v_subtotal,
    'currency', 'BRL',
    'createdAt', now()
  );
end;
$$;

revoke all on function public.create_public_order(text, text, text, uuid, text, text, integer, jsonb)
  from public, authenticated;
grant execute on function public.create_public_order(text, text, text, uuid, text, text, integer, jsonb) to anon;
