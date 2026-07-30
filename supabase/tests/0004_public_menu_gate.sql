-- Testes do cardápio público da Fase 4.
-- Cobre AC-PUB-001 (QR válido mostra o cardápio correto), AC-PUB-002 (QR
-- inválido/mesa desativada/estabelecimento errado não revela nada) e
-- AC-QR-001 (token antigo falha após regenerar, novo funciona). Mesmo
-- formato dos testes anteriores: tudo roda em uma transação com ROLLBACK.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values ('d1d1d1d1-1111-0000-0000-000000000001', 'owner-g@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug, is_active)
values
  ('11110000-0000-0000-0000-000000000001', 'Estabelecimento G LTDA', 'Estabelecimento G', 'rls-test-estabelecimento-g', true),
  ('11120000-0000-0000-0000-000000000001', 'Estabelecimento H LTDA', 'Estabelecimento H', 'rls-test-estabelecimento-h', true);

insert into public.establishment_members (establishment_id, user_id, role)
values ('11110000-0000-0000-0000-000000000001', 'd1d1d1d1-1111-0000-0000-000000000001', 'owner');

insert into public.plans (id, code, name, price_cents)
values ('11130000-0000-0000-0000-000000000001', 'public-menu-test-plan', 'Plano Teste', 5000);

insert into public.subscriptions (establishment_id, plan_id, status, current_period_start, current_period_end)
values ('11110000-0000-0000-0000-000000000001', '11130000-0000-0000-0000-000000000001', 'active', now(), now() + interval '30 days');
-- Estabelecimento H fica de propósito sem assinatura (simula bloqueio de cobrança).

insert into public.dining_tables (id, establishment_id, name, public_token, is_active)
values
  ('11140000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000001', 'Mesa 1', 'token-valido-g', true),
  ('11140000-0000-0000-0000-000000000002', '11110000-0000-0000-0000-000000000001', 'Mesa Inativa', 'token-mesa-inativa', false),
  ('11140000-0000-0000-0000-000000000003', '11120000-0000-0000-0000-000000000001', 'Mesa 1', 'token-valido-h', true);

insert into public.categories (id, establishment_id, name, is_active)
values ('11150000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000001', 'Lanches', true);

insert into public.products (id, establishment_id, category_id, name, slug, short_description, base_price_cents, status, is_available)
values
  ('11160000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000001', '11150000-0000-0000-0000-000000000001', 'Publicado Disponível', 'publicado-disponivel', 'ok', 1000, 'published', true),
  ('11160000-0000-0000-0000-000000000002', '11110000-0000-0000-0000-000000000001', '11150000-0000-0000-0000-000000000001', 'Publicado Esgotado', 'publicado-esgotado', 'ok', 1000, 'published', false),
  ('11160000-0000-0000-0000-000000000003', '11110000-0000-0000-0000-000000000001', '11150000-0000-0000-0000-000000000001', 'Rascunho', 'rascunho', 'ok', 1000, 'draft', true),
  ('11160000-0000-0000-0000-000000000004', '11110000-0000-0000-0000-000000000001', '11150000-0000-0000-0000-000000000001', 'Arquivado', 'arquivado', 'ok', 1000, 'archived', true);

-- Todas as chamadas abaixo simulam o consumidor: role anon, sem JWT.

set local role anon;

-- AC-PUB-001 — QR válido mostra exatamente os produtos publicados ----------

do $$
declare
  v_result jsonb;
  v_product_count int;
begin
  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-valido-g');

  if (v_result ->> 'valid')::boolean <> true then
    raise exception 'FALHA AC-PUB-001: QR válido deveria retornar valid=true, retornou %', v_result;
  end if;

  if (v_result -> 'access' ->> 'allowed')::boolean <> true then
    raise exception 'FALHA AC-PUB-001: assinatura ativa deveria liberar acesso, retornou %', v_result -> 'access';
  end if;

  select jsonb_array_length(v_result -> 'categories' -> 0 -> 'products') into v_product_count;
  if v_product_count <> 2 then
    raise exception 'FALHA AC-PUB-001/AC-CAT-001: deveriam aparecer 2 produtos (publicado disponível + esgotado), veio % — payload: %', v_product_count, v_result;
  end if;

  if not (v_result -> 'categories' -> 0 -> 'products' @> '[{"slug":"publicado-disponivel","isAvailable":true}]'::jsonb) then
    raise exception 'FALHA: produto publicado disponível ausente ou com isAvailable incorreto';
  end if;

  if not (v_result -> 'categories' -> 0 -> 'products' @> '[{"slug":"publicado-esgotado","isAvailable":false}]'::jsonb) then
    raise exception 'FALHA AC-CAT-001: produto esgotado deveria aparecer com isAvailable=false';
  end if;

  if v_result -> 'categories' -> 0 -> 'products' @> '[{"slug":"rascunho"}]'::jsonb then
    raise exception 'FALHA AC-CAT-001: rascunho não deveria aparecer no cardápio público';
  end if;

  if v_result -> 'categories' -> 0 -> 'products' @> '[{"slug":"arquivado"}]'::jsonb then
    raise exception 'FALHA AC-CAT-001: produto arquivado não deveria aparecer no cardápio público';
  end if;
end $$;

-- AC-PUB-002 — combinações inválidas não revelam nada ----------------------

do $$
declare
  v_result jsonb;
begin
  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-que-nao-existe');
  if (v_result ->> 'valid')::boolean <> false or jsonb_typeof(v_result) <> 'object' or (v_result ? 'establishment') then
    raise exception 'FALHA AC-PUB-002: token inexistente deveria retornar só {valid:false}, retornou %', v_result;
  end if;

  v_result := public.get_public_menu('slug-que-nao-existe', 'token-valido-g');
  if (v_result ->> 'valid')::boolean <> false then
    raise exception 'FALHA AC-PUB-002: slug inexistente deveria retornar valid=false';
  end if;

  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-mesa-inativa');
  if (v_result ->> 'valid')::boolean <> false then
    raise exception 'FALHA AC-PUB-002: mesa desativada deveria retornar valid=false';
  end if;

  -- Token de uma mesa não pode abrir o cardápio combinado com outro slug.
  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-valido-h');
  if (v_result ->> 'valid')::boolean <> false then
    raise exception 'FALHA AC-PUB-002: token de H não deveria validar contra o slug de G';
  end if;
end $$;

-- Estabelecimento sem assinatura: QR válido, mas acesso bloqueado ----------

do $$
declare
  v_result jsonb;
begin
  v_result := public.get_public_menu('rls-test-estabelecimento-h', 'token-valido-h');
  if (v_result ->> 'valid')::boolean <> true then
    raise exception 'FALHA: mesa de H é válida, get_public_menu deveria retornar valid=true';
  end if;
  if (v_result -> 'access' ->> 'allowed')::boolean <> false then
    raise exception 'FALHA: H não tem assinatura, acesso deveria estar bloqueado';
  end if;
end $$;

-- ensure_guest_session cria e depois reaproveita a mesma sessão -----------

do $$
declare
  v_result jsonb;
  v_session_id_1 uuid;
  v_session_id_2 uuid;
  v_count int;
begin
  v_result := public.ensure_guest_session(
    '11110000-0000-0000-0000-000000000001'::uuid,
    '11140000-0000-0000-0000-000000000001'::uuid,
    'hash-de-teste-abc',
    now() + interval '12 hours'
  );
  v_session_id_1 := (v_result ->> 'sessionId')::uuid;

  v_result := public.ensure_guest_session(
    '11110000-0000-0000-0000-000000000001'::uuid,
    '11140000-0000-0000-0000-000000000001'::uuid,
    'hash-de-teste-abc',
    now() + interval '12 hours'
  );
  v_session_id_2 := (v_result ->> 'sessionId')::uuid;

  if v_session_id_1 <> v_session_id_2 then
    raise exception 'FALHA: ensure_guest_session deveria reaproveitar a mesma sessão para o mesmo hash/mesa';
  end if;
end $$;

set local role service_role;

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.guest_sessions where token_hash = 'hash-de-teste-abc';
  if v_count <> 1 then
    raise exception 'FALHA: deveria existir exatamente 1 guest_session para o hash de teste, encontrado %', v_count;
  end if;
end $$;

-- AC-QR-001 — regenerar invalida o token antigo imediatamente --------------

select set_config('request.jwt.claims', json_build_object('sub', 'd1d1d1d1-1111-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

update public.dining_tables
  set public_token = 'token-novo-g', token_version = token_version + 1
  where id = '11140000-0000-0000-0000-000000000001';

set local role anon;

do $$
declare
  v_result jsonb;
begin
  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-valido-g');
  if (v_result ->> 'valid')::boolean <> false then
    raise exception 'FALHA AC-QR-001: token antigo deveria falhar após regenerar';
  end if;

  v_result := public.get_public_menu('rls-test-estabelecimento-g', 'token-novo-g');
  if (v_result ->> 'valid')::boolean <> true then
    raise exception 'FALHA AC-QR-001: novo token deveria funcionar imediatamente';
  end if;
end $$;

do $$
begin
  raise notice 'OK: todos os testes do cardápio público da Fase 4 passaram';
end $$;

rollback;
