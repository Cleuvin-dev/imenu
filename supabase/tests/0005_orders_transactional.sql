-- Testes da Fase 5 — pedido transacional (docs/05 §2-3, docs/11 AC-ORD-002 a
-- 008). Mesmo formato dos testes anteriores: tudo roda em uma transação com
-- ROLLBACK final, nunca persiste dados.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('55550000-1111-0000-0000-000000000001', 'owner-orders@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('55550000-1111-0000-0000-000000000002', 'kitchen-orders@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('55550000-1111-0000-0000-000000000003', 'menueditor-orders@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('55550000-1111-0000-0000-000000000004', 'owner-orders-j@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug, is_active, accepting_orders)
values
  ('55550000-2222-0000-0000-000000000001', 'Estabelecimento Pedidos I LTDA', 'Estabelecimento Pedidos I', 'orders-test-i', true, true),
  ('55550000-2222-0000-0000-000000000002', 'Estabelecimento Pedidos J LTDA', 'Estabelecimento Pedidos J', 'orders-test-j', true, true);

insert into public.establishment_members (establishment_id, user_id, role)
values
  ('55550000-2222-0000-0000-000000000001', '55550000-1111-0000-0000-000000000001', 'owner'),
  ('55550000-2222-0000-0000-000000000001', '55550000-1111-0000-0000-000000000002', 'kitchen'),
  ('55550000-2222-0000-0000-000000000001', '55550000-1111-0000-0000-000000000003', 'menu_editor'),
  ('55550000-2222-0000-0000-000000000002', '55550000-1111-0000-0000-000000000004', 'owner');

insert into public.plans (id, code, name, price_cents)
values ('55550000-3333-0000-0000-000000000001', 'orders-test-plan', 'Plano Teste Pedidos', 5000);

insert into public.subscriptions (establishment_id, plan_id, status, current_period_start, current_period_end)
values ('55550000-2222-0000-0000-000000000001', '55550000-3333-0000-0000-000000000001', 'active', now(), now() + interval '30 days');

insert into public.dining_tables (id, establishment_id, name, public_token, is_active)
values ('55550000-4444-0000-0000-000000000001', '55550000-2222-0000-0000-000000000001', 'Mesa Pedidos', 'orders-test-token-i', true);

insert into public.categories (id, establishment_id, name, is_active)
values ('55550000-5555-0000-0000-000000000001', '55550000-2222-0000-0000-000000000001', 'Categoria Pedidos', true);

insert into public.products (id, establishment_id, category_id, name, slug, short_description, base_price_cents, status, is_available)
values
  ('55550000-6666-0000-0000-000000000001', '55550000-2222-0000-0000-000000000001', '55550000-5555-0000-0000-000000000001', 'Suco', 'suco-pedidos-test', 'ok', 1000, 'published', true),
  ('55550000-6666-0000-0000-000000000002', '55550000-2222-0000-0000-000000000001', '55550000-5555-0000-0000-000000000001', 'Lanche', 'lanche-pedidos-test', 'ok', 2000, 'published', true),
  ('55550000-6666-0000-0000-000000000003', '55550000-2222-0000-0000-000000000001', '55550000-5555-0000-0000-000000000001', 'Esgotado', 'esgotado-pedidos-test', 'ok', 500, 'published', false),
  ('55550000-6666-0000-0000-000000000004', '55550000-2222-0000-0000-000000000001', '55550000-5555-0000-0000-000000000001', 'Rascunho', 'rascunho-pedidos-test', 'ok', 500, 'draft', true);

insert into public.option_groups (id, establishment_id, name, min_select, max_select, is_active)
values ('55550000-7777-0000-0000-000000000001', '55550000-2222-0000-0000-000000000001', 'Tamanho', 1, 1, true);

insert into public.options (id, establishment_id, option_group_id, name, price_delta_cents, is_available)
values
  ('55550000-8888-0000-0000-000000000001', '55550000-2222-0000-0000-000000000001', '55550000-7777-0000-0000-000000000001', 'Grande', 500, true),
  ('55550000-8888-0000-0000-000000000002', '55550000-2222-0000-0000-000000000001', '55550000-7777-0000-0000-000000000001', 'Pequeno', 0, true);

insert into public.product_option_groups (establishment_id, product_id, option_group_id)
values ('55550000-2222-0000-0000-000000000001', '55550000-6666-0000-0000-000000000002', '55550000-7777-0000-0000-000000000001');

-- Todas as chamadas de create_public_order simulam o consumidor: role anon.
set local role anon;

-- AC-ORD-002/003 — servidor recalcula o total; cliente tentando informar um
-- total mais baixo (500 em vez dos 2000 reais) é rejeitado, pedido nenhum é criado.
do $$
begin
  begin
    perform public.create_public_order(
      'orders-test-token-i', 'guest-hash-a', gen_random_uuid(), 'payload-a', 'tracking-a-nao-usado', 500,
      jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 2, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
    );
    raise exception 'FALHA AC-ORD-002/003: total divergente (cliente informou 500, real é 2000) deveria ter sido rejeitado com PRICE_CHANGED';
  exception
    when sqlstate 'IM006' then
      null;
  end;
end $$;

-- anon não tem policy de select em orders (só authenticated/platform admin);
-- as checagens de contagem abaixo precisam do papel service_role para
-- enxergar as linhas de fato (bypassa RLS), senão count(*) sempre dá 0
-- independentemente do que foi persistido de verdade.
set local role service_role;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.orders where public_tracking_token_hash = 'tracking-a-nao-usado';
  if v_count <> 0 then
    raise exception 'FALHA AC-ORD-003: nenhum pedido deveria ter sido criado quando o preço diverge';
  end if;
end $$;
set local role anon;

-- Pedido válido: Suco x2, sem expectedTotalCents (servidor calcula sozinho).
do $$
declare
  v_result jsonb;
begin
  v_result := public.create_public_order(
    'orders-test-token-i', 'guest-hash-b', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'payload-b', 'tracking-b', null,
    jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 2, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
  );
  if (v_result ->> 'totalCents')::int <> 2000 then
    raise exception 'FALHA AC-ORD-002: total deveria ser 2000 (1000 x 2), veio %', v_result;
  end if;
  if v_result ->> 'status' <> 'pending' then
    raise exception 'FALHA: status inicial deveria ser pending, veio %', v_result;
  end if;
end $$;

-- AC-ORD-005 — retry idempotente: mesma client_request_id + mesmo payload_hash
-- devolve o pedido já criado, sem duplicar.
do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.create_public_order(
    'orders-test-token-i', 'guest-hash-b', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'payload-b', 'tracking-b', null,
    jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 2, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
  );
  if (v_result ->> 'totalCents')::int <> 2000 then
    raise exception 'FALHA AC-ORD-005: retry deveria devolver o mesmo total, veio %', v_result;
  end if;
end $$;

set local role service_role;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.orders where client_request_id = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid;
  if v_count <> 1 then
    raise exception 'FALHA AC-ORD-005: deveria existir exatamente 1 pedido para essa client_request_id, encontrado %', v_count;
  end if;
end $$;
set local role anon;

-- AC-ORD-006 — mesma client_request_id com payload diferente é rejeitada.
do $$
begin
  begin
    perform public.create_public_order(
      'orders-test-token-i', 'guest-hash-b', 'aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'payload-diferente', 'tracking-b2', null,
      jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 3, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
    );
    raise exception 'FALHA AC-ORD-006: payload diferente na mesma client_request_id deveria ser rejeitado com IDEMPOTENCY_CONFLICT';
  exception
    when sqlstate 'IM008' then
      null;
  end;
end $$;

-- AC-ORD-004 — produto esgotado não cria pedido parcial nem completo.
set local role service_role;
do $$
declare
  v_count_before int;
begin
  select count(*) into v_count_before from public.orders;
  perform set_config('imenu.test_count_before', v_count_before::text, true);
end $$;
set local role anon;

do $$
begin
  begin
    perform public.create_public_order(
      'orders-test-token-i', 'guest-hash-e', gen_random_uuid(), 'payload-e', 'tracking-e', null,
      jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000003', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
    );
    raise exception 'FALHA AC-ORD-004: produto esgotado deveria ser rejeitado com PRODUCT_UNAVAILABLE';
  exception
    when sqlstate 'IM005' then
      null;
  end;
end $$;

set local role service_role;
do $$
declare
  v_count_after int;
begin
  select count(*) into v_count_after from public.orders;
  if v_count_after <> current_setting('imenu.test_count_before')::int then
    raise exception 'FALHA AC-ORD-004: nenhum pedido deveria ter sido criado';
  end if;
end $$;
set local role anon;

-- Seleção de opções inválida: grupo obrigatório (min_select=1) sem nenhuma opção escolhida.
do $$
begin
  begin
    perform public.create_public_order(
      'orders-test-token-i', 'guest-hash-f', gen_random_uuid(), 'payload-f', 'tracking-f', null,
      jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000002', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
    );
    raise exception 'FALHA: seleção de opções abaixo do mínimo deveria ser rejeitada com INVALID_OPTION_SELECTION';
  exception
    when sqlstate 'IM007' then
      null;
  end;
end $$;

-- Pedido válido com opção (Lanche + Grande) — usado nos testes de transição.
do $$
declare
  v_result jsonb;
begin
  v_result := public.create_public_order(
    'orders-test-token-i', 'guest-hash-g', gen_random_uuid(), 'payload-g', 'tracking-g', null,
    jsonb_build_array(jsonb_build_object(
      'productId', '55550000-6666-0000-0000-000000000002', 'quantity', 1,
      'selectedOptionIds', jsonb_build_array('55550000-8888-0000-0000-000000000001'), 'notes', 'sem gelo'
    ))
  );
  if (v_result ->> 'totalCents')::int <> 2500 then
    raise exception 'FALHA: total do lanche com opção Grande deveria ser 2500 (2000+500), veio %', v_result;
  end if;
end $$;

-- Dois pedidos simples adicionais: um para testar exigência de motivo, outro para papel insuficiente.
do $$
begin
  perform public.create_public_order(
    'orders-test-token-i', 'guest-hash-h', gen_random_uuid(), 'payload-h', 'tracking-h', null,
    jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
  );
  perform public.create_public_order(
    'orders-test-token-i', 'guest-hash-role', gen_random_uuid(), 'payload-role', 'tracking-role', null,
    jsonb_build_array(jsonb_build_object('productId', '55550000-6666-0000-0000-000000000001', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
  );
end $$;

-- A partir daqui simula a equipe autenticada (kitchen-orders@imenu.test).
select set_config('request.jwt.claims', json_build_object('sub', '55550000-1111-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;

-- AC-ORD-007 — transição inválida: pending não pode ir direto para ready.
do $$
begin
  begin
    perform public.transition_order_status(
      (select id from public.orders where public_tracking_token_hash = 'tracking-g'), 'ready'
    );
    raise exception 'FALHA AC-ORD-007: pending -> ready direto deveria ser rejeitado';
  exception
    when sqlstate 'IM010' then
      null;
  end;
end $$;

-- Transição válida (kitchen pode aceitar) com operation_id explícito.
do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.transition_order_status(
    (select id from public.orders where public_tracking_token_hash = 'tracking-g'), 'accepted', null,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid
  );
  if v_result ->> 'status' <> 'accepted' then
    raise exception 'FALHA: transição deveria retornar status accepted, veio %', v_result;
  end if;

  select count(*) into v_count from public.order_status_history
    where order_id = (select id from public.orders where public_tracking_token_hash = 'tracking-g');
  if v_count <> 2 then
    raise exception 'FALHA AC-ORD-008: deveriam existir 2 registros de histórico (criação + aceite), encontrado %', v_count;
  end if;
end $$;

-- Repetir a mesma operation_id não duplica histórico (docs/05 §3).
do $$
declare
  v_result jsonb;
  v_count int;
begin
  v_result := public.transition_order_status(
    (select id from public.orders where public_tracking_token_hash = 'tracking-g'), 'accepted', null,
    'bbbbbbbb-0000-0000-0000-000000000001'::uuid
  );
  if v_result ->> 'status' <> 'accepted' then
    raise exception 'FALHA: replay da operation_id deveria devolver status accepted';
  end if;

  select count(*) into v_count from public.order_status_history
    where order_id = (select id from public.orders where public_tracking_token_hash = 'tracking-g');
  if v_count <> 2 then
    raise exception 'FALHA AC-ORD-008: replay da mesma operation_id não deveria duplicar histórico, encontrado %', v_count;
  end if;
end $$;

-- Motivo obrigatório: rejeitar sem motivo falha; com motivo sucede e persiste.
do $$
begin
  begin
    perform public.transition_order_status(
      (select id from public.orders where public_tracking_token_hash = 'tracking-h'), 'rejected'
    );
    raise exception 'FALHA: rejeitar sem motivo deveria ser rejeitado (motivo obrigatório)';
  exception
    when sqlstate 'IM009' then
      null;
  end;
end $$;

do $$
declare
  v_result jsonb;
begin
  v_result := public.transition_order_status(
    (select id from public.orders where public_tracking_token_hash = 'tracking-h'), 'rejected', 'Sem estoque do item'
  );
  if v_result ->> 'status' <> 'rejected' then
    raise exception 'FALHA: rejeição com motivo deveria suceder, veio %', v_result;
  end if;
end $$;

do $$
declare
  v_reason text;
begin
  select rejection_reason into v_reason from public.orders where public_tracking_token_hash = 'tracking-h';
  if v_reason <> 'Sem estoque do item' then
    raise exception 'FALHA: rejection_reason não foi persistido corretamente, veio %', v_reason;
  end if;
end $$;

-- Papel insuficiente: menu_editor não pode aceitar pedido (fora da matriz de permissões).
select set_config('request.jwt.claims', json_build_object('sub', '55550000-1111-0000-0000-000000000003', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    perform public.transition_order_status(
      (select id from public.orders where public_tracking_token_hash = 'tracking-role'), 'accepted'
    );
    raise exception 'FALHA: menu_editor não deveria conseguir aceitar pedido';
  exception
    when sqlstate '42501' then
      null;
  end;
end $$;

-- AC-TEN-001 (isolamento) aplicado a pedidos: owner de J não lê pedidos de I.
select set_config('request.jwt.claims', json_build_object('sub', '55550000-1111-0000-0000-000000000004', 'role', 'authenticated')::text, true);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.orders where establishment_id = '55550000-2222-0000-0000-000000000001';
  if v_count <> 0 then
    raise exception 'FALHA AC-TEN-001: owner de J não deveria enxergar nenhum pedido de I, encontrado %', v_count;
  end if;
end $$;

do $$
begin
  raise notice 'OK: todos os testes de pedido transacional da Fase 5 passaram';
end $$;

rollback;
