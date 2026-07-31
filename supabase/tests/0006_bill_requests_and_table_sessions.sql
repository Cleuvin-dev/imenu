-- Testes da Fase 7 — conta e fechamento de mesa (docs/03, docs/05, docs/11
-- AC-BILL-001/002). Mesmo formato dos testes anteriores: tudo roda em uma
-- transação com ROLLBACK final, nunca persiste dados.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('66660000-1111-0000-0000-000000000001', 'owner-bill@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('66660000-1111-0000-0000-000000000002', 'manager-bill@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('66660000-1111-0000-0000-000000000003', 'cashier-bill@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('66660000-1111-0000-0000-000000000004', 'kitchen-bill@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('66660000-1111-0000-0000-000000000005', 'menueditor-bill@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug, is_active, accepting_orders)
values ('66660000-2222-0000-0000-000000000001', 'Estabelecimento Conta LTDA', 'Estabelecimento Conta', 'bill-test', true, true);

insert into public.establishment_members (establishment_id, user_id, role)
values
  ('66660000-2222-0000-0000-000000000001', '66660000-1111-0000-0000-000000000001', 'owner'),
  ('66660000-2222-0000-0000-000000000001', '66660000-1111-0000-0000-000000000002', 'manager'),
  ('66660000-2222-0000-0000-000000000001', '66660000-1111-0000-0000-000000000003', 'cashier'),
  ('66660000-2222-0000-0000-000000000001', '66660000-1111-0000-0000-000000000004', 'kitchen'),
  ('66660000-2222-0000-0000-000000000001', '66660000-1111-0000-0000-000000000005', 'menu_editor');

insert into public.plans (id, code, name, price_cents)
values ('66660000-3333-0000-0000-000000000001', 'bill-test-plan', 'Plano Teste Conta', 5000);

insert into public.subscriptions (establishment_id, plan_id, status, current_period_start, current_period_end)
values ('66660000-2222-0000-0000-000000000001', '66660000-3333-0000-0000-000000000001', 'active', now(), now() + interval '30 days');

insert into public.dining_tables (id, establishment_id, name, public_token, is_active)
values ('66660000-4444-0000-0000-000000000001', '66660000-2222-0000-0000-000000000001', 'Mesa Conta', 'bill-test-token', true);

insert into public.categories (id, establishment_id, name, is_active)
values ('66660000-5555-0000-0000-000000000001', '66660000-2222-0000-0000-000000000001', 'Categoria Conta', true);

insert into public.products (id, establishment_id, category_id, name, slug, short_description, base_price_cents, status, is_available)
values ('66660000-6666-0000-0000-000000000001', '66660000-2222-0000-0000-000000000001', '66660000-5555-0000-0000-000000000001', 'Suco Conta', 'suco-conta-test', 'ok', 1000, 'published', true);

-- ---------------------------------------------------------------------
-- Sem sessão aberta ainda: solicitar conta deve falhar (IM011).
-- ---------------------------------------------------------------------
set local role anon;

do $$
begin
  begin
    perform public.request_table_bill('bill-test-token', 'guest-hash-bill', gen_random_uuid());
    raise exception 'FALHA: solicitar conta sem sessão aberta deveria falhar com IM011';
  exception
    when sqlstate 'IM011' then null;
  end;
end $$;

-- Abre a sessão criando o primeiro pedido (mesmo fluxo real do consumidor).
select public.create_public_order(
  'bill-test-token', 'guest-hash-bill', gen_random_uuid(), 'payload-bill-1', 'tracking-bill-1', null,
  jsonb_build_array(jsonb_build_object('productId', '66660000-6666-0000-0000-000000000001', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
);

do $$
declare
  v_session_id uuid;
begin
  set local role service_role;
  select id into v_session_id from public.table_service_sessions where table_id = '66660000-4444-0000-0000-000000000001' and status = 'open';
  perform set_config('imenu.test_session_id', v_session_id::text, true);
end $$;

-- ---------------------------------------------------------------------
-- AC-BILL-001/002 — solicitar conta é idempotente por sessão: uma segunda
-- chamada (device diferente, client_request_id diferente) devolve a MESMA
-- solicitação em vez de criar outra.
-- ---------------------------------------------------------------------
set local role anon;
select public.request_table_bill('bill-test-token', 'guest-hash-bill', gen_random_uuid());
select public.request_table_bill('bill-test-token', 'guest-hash-outro-dispositivo', gen_random_uuid());

do $$
declare
  v_count integer;
begin
  set local role service_role;
  select count(*) into v_count
    from public.bill_requests
    where table_service_session_id = current_setting('imenu.test_session_id')::uuid
      and status in ('requested', 'acknowledged', 'bill_delivered');
  if v_count <> 1 then
    raise exception 'FALHA AC-BILL-002: esperava 1 solicitação ativa, achou %', v_count;
  end if;
end $$;

do $$
declare
  v_bill_id uuid;
begin
  set local role service_role;
  select id into v_bill_id from public.bill_requests where table_service_session_id = current_setting('imenu.test_session_id')::uuid;
  perform set_config('imenu.test_bill_id', v_bill_id::text, true);
end $$;

-- ---------------------------------------------------------------------
-- Papel insuficiente: kitchen não pode transicionar (docs/02 §3, "L").
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '66660000-1111-0000-0000-000000000004', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  begin
    perform public.transition_bill_request_status(current_setting('imenu.test_bill_id')::uuid, 'acknowledged');
    raise exception 'FALHA: kitchen não deveria conseguir reconhecer a solicitação';
  exception
    when sqlstate '42501' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- RLS: menu_editor não lê bill_requests (docs/02 §3, "—").
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '66660000-1111-0000-0000-000000000005', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.bill_requests where establishment_id = '66660000-2222-0000-0000-000000000001';
  if v_count <> 0 then
    raise exception 'FALHA RLS: menu_editor não deveria enxergar nenhuma linha de bill_requests, achou %', v_count;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Fluxo feliz: cashier reconhece, marca entregue (AC-BILL-001).
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '66660000-1111-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;

select public.transition_bill_request_status(current_setting('imenu.test_bill_id')::uuid, 'acknowledged');

-- Idempotente: repetir a mesma transição não lança erro nem muda o resultado.
select public.transition_bill_request_status(current_setting('imenu.test_bill_id')::uuid, 'acknowledged');

select public.transition_bill_request_status(current_setting('imenu.test_bill_id')::uuid, 'bill_delivered');

do $$
begin
  begin
    perform public.transition_bill_request_status(current_setting('imenu.test_bill_id')::uuid, 'closed');
    raise exception 'FALHA: closed não é uma transição válida de transition_bill_request_status (fechar é close_table_session)';
  exception
    when sqlstate 'IM010' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- Fechamento bloqueado por pedido em aberto; cashier não pode forçar;
-- owner pode, e a ação fica auditada (docs/05).
-- ---------------------------------------------------------------------
do $$
begin
  begin
    perform public.close_table_session(current_setting('imenu.test_session_id')::uuid, false);
    raise exception 'FALHA: fechar sessão com pedido pending deveria falhar com IM013';
  exception
    when sqlstate 'IM013' then null;
  end;
end $$;

do $$
begin
  begin
    perform public.close_table_session(current_setting('imenu.test_session_id')::uuid, true);
    raise exception 'FALHA: cashier não deveria conseguir forçar o fechamento com pedidos em aberto';
  exception
    when sqlstate '42501' then null;
  end;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', '66660000-1111-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select public.close_table_session(current_setting('imenu.test_session_id')::uuid, true);

do $$
declare
  v_session_status public.table_session_status;
  v_bill_status public.bill_request_status;
  v_audit_count integer;
begin
  set local role service_role;
  select status into v_session_status from public.table_service_sessions where id = current_setting('imenu.test_session_id')::uuid;
  select status into v_bill_status from public.bill_requests where id = current_setting('imenu.test_bill_id')::uuid;
  select count(*) into v_audit_count
    from public.audit_logs
    where resource_type = 'table_service_session'
      and resource_id = current_setting('imenu.test_session_id')::text
      and action = 'table_session.force_close_with_open_orders';

  if v_session_status <> 'closed' then
    raise exception 'FALHA: sessão deveria estar closed, está %', v_session_status;
  end if;
  if v_bill_status <> 'closed' then
    raise exception 'FALHA: bill_request deveria fechar como efeito colateral, está %', v_bill_status;
  end if;
  if v_audit_count <> 1 then
    raise exception 'FALHA: fechamento forçado deveria gerar 1 registro de auditoria, achou %', v_audit_count;
  end if;
end $$;

-- Fechar de novo é idempotente (no-op, sessão já fechada).
select public.close_table_session(current_setting('imenu.test_session_id')::uuid, false);

-- ---------------------------------------------------------------------
-- docs/03 §regra 8: depois de fechar, o próximo pedido abre NOVA sessão.
-- ---------------------------------------------------------------------
set local role anon;

select public.create_public_order(
  'bill-test-token', 'guest-hash-bill', gen_random_uuid(), 'payload-bill-2', 'tracking-bill-2', null,
  jsonb_build_array(jsonb_build_object('productId', '66660000-6666-0000-0000-000000000001', 'quantity', 1, 'selectedOptionIds', '[]'::jsonb, 'notes', null))
);

do $$
declare
  v_new_session_id uuid;
  v_open_sessions_count integer;
begin
  set local role service_role;
  select count(*) into v_open_sessions_count
    from public.table_service_sessions
    where table_id = '66660000-4444-0000-0000-000000000001' and status = 'open';
  if v_open_sessions_count <> 1 then
    raise exception 'FALHA regra 8: esperava exatamente 1 sessão aberta após novo pedido, achou %', v_open_sessions_count;
  end if;

  select id into v_new_session_id
    from public.table_service_sessions
    where table_id = '66660000-4444-0000-0000-000000000001' and status = 'open';
  if v_new_session_id = current_setting('imenu.test_session_id')::uuid then
    raise exception 'FALHA regra 8: deveria ter aberto uma sessão nova, não reaproveitado a fechada';
  end if;
  perform set_config('imenu.test_session_2_id', v_new_session_id::text, true);
end $$;

-- ---------------------------------------------------------------------
-- Cancelar exige motivo; depois de cancelada, uma nova solicitação pode
-- ser feita para a mesma sessão (o índice único só cobre status ativos).
-- ---------------------------------------------------------------------
set local role anon;
select public.request_table_bill('bill-test-token', 'guest-hash-bill', gen_random_uuid());

do $$
declare
  v_bill_2_id uuid;
begin
  set local role service_role;
  select id into v_bill_2_id from public.bill_requests where table_service_session_id = current_setting('imenu.test_session_2_id')::uuid;
  perform set_config('imenu.test_bill_2_id', v_bill_2_id::text, true);
end $$;

select set_config('request.jwt.claims', json_build_object('sub', '66660000-1111-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  begin
    perform public.transition_bill_request_status(current_setting('imenu.test_bill_2_id')::uuid, 'canceled');
    raise exception 'FALHA: cancelar sem motivo deveria falhar com IM009';
  exception
    when sqlstate 'IM009' then null;
  end;
end $$;

select public.transition_bill_request_status(current_setting('imenu.test_bill_2_id')::uuid, 'canceled', 'Cliente desistiu, mesa ainda ocupada');

set local role anon;
select public.request_table_bill('bill-test-token', 'guest-hash-bill', gen_random_uuid());

do $$
declare
  v_total_count integer;
begin
  set local role service_role;
  select count(*) into v_total_count from public.bill_requests where table_service_session_id = current_setting('imenu.test_session_2_id')::uuid;
  if v_total_count <> 2 then
    raise exception 'FALHA: esperava 2 solicitações (1 cancelada + 1 nova) para a segunda sessão, achou %', v_total_count;
  end if;
end $$;

-- get_table_bill_status deve sempre priorizar a sessão OPEN, mesmo que uma
-- sessão já fechada tenha o mesmo (ou mais recente) opened_at — cenário
-- real neste próprio teste, já que now() fica congelado durante toda a
-- transação (ver correção em get_table_bill_status_prefer_open).
do $$
declare
  v_status jsonb;
begin
  set local role anon;
  v_status := public.get_table_bill_status('bill-test-token');
  if (v_status -> 'session' ->> 'status') <> 'open' then
    raise exception 'FALHA: get_table_bill_status deveria retornar a sessão aberta, retornou %', v_status -> 'session' ->> 'status';
  end if;
end $$;

rollback;
