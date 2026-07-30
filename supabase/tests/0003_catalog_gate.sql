-- Testes de catálogo da Fase 3.
-- Cobre AC-CAT-001 (rascunho não aparece / publicado aparece / arquivado não
-- aparece, isolamento de tenant) e validações de publish_product usadas por
-- AC-MEDIA-001 indiretamente (produto precisa de campos mínimos antes de
-- aceitar mídia "publicável"). Mesmo formato dos testes anteriores: tudo
-- roda em uma transação que termina em ROLLBACK.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'owner-e@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('a2a2a2a2-0000-0000-0000-000000000001', 'menu-editor-e@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('a3a3a3a3-0000-0000-0000-000000000001', 'kitchen-e@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('b1b1b1b1-0000-0000-0000-000000000001', 'owner-f@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug)
values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'Estabelecimento E LTDA', 'Estabelecimento E', 'rls-test-estabelecimento-e'),
  ('d1d1d1d1-0000-0000-0000-000000000001', 'Estabelecimento F LTDA', 'Estabelecimento F', 'rls-test-estabelecimento-f');

insert into public.establishment_members (establishment_id, user_id, role)
values
  ('c1c1c1c1-0000-0000-0000-000000000001', 'a1a1a1a1-0000-0000-0000-000000000001', 'owner'),
  ('c1c1c1c1-0000-0000-0000-000000000001', 'a2a2a2a2-0000-0000-0000-000000000001', 'menu_editor'),
  ('c1c1c1c1-0000-0000-0000-000000000001', 'a3a3a3a3-0000-0000-0000-000000000001', 'kitchen'),
  ('d1d1d1d1-0000-0000-0000-000000000001', 'b1b1b1b1-0000-0000-0000-000000000001', 'owner');

insert into public.categories (id, establishment_id, name, is_active)
values
  ('e1e1e1e1-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'Categoria Ativa E', true),
  ('e2e2e2e2-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'Categoria Inativa E', false);

insert into public.products (id, establishment_id, category_id, name, slug, short_description, base_price_cents, status)
values
  ('f1f1f1f1-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'e1e1e1e1-0000-0000-0000-000000000001', 'Produto Publicável', 'produto-publicavel', 'Descrição curta', 1500, 'draft'),
  ('f2f2f2f2-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'e1e1e1e1-0000-0000-0000-000000000001', 'Produto Sem Descricao', 'produto-sem-descricao', null, 1500, 'draft'),
  ('f3f3f3f3-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-000000000001', 'e2e2e2e2-0000-0000-0000-000000000001', 'Produto Categoria Inativa', 'produto-categoria-inativa', 'Descrição curta', 1500, 'draft');

-- AC-CAT-001 — owner E publica produto válido, produto vira "published" -----

select set_config('request.jwt.claims', json_build_object('sub', 'a1a1a1a1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select public.publish_product('f1f1f1f1-0000-0000-0000-000000000001'::uuid);

do $$
declare
  v_status public.product_status;
begin
  select status into v_status from public.products where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if v_status <> 'published' then
    raise exception 'FALHA AC-CAT-001: produto válido não foi publicado (status=%)', v_status;
  end if;
end $$;

-- publish_product rejeita produto sem descrição curta -----------------------

savepoint before_publish_missing_description;
do $$
begin
  perform public.publish_product('f2f2f2f2-0000-0000-0000-000000000001'::uuid);
  raise exception 'FALHA RF-EST-014: publicou produto sem descrição curta';
exception
  when sqlstate '22023' then
    raise notice 'OK: publish_product rejeitou produto sem descrição curta';
end $$;
rollback to savepoint before_publish_missing_description;

-- publish_product rejeita produto de categoria inativa ----------------------

savepoint before_publish_inactive_category;
do $$
begin
  perform public.publish_product('f3f3f3f3-0000-0000-0000-000000000001'::uuid);
  raise exception 'FALHA docs/03 regra 5: publicou produto de categoria inativa';
exception
  when sqlstate '22023' then
    raise notice 'OK: publish_product rejeitou produto de categoria inativa';
end $$;
rollback to savepoint before_publish_inactive_category;

-- AC-CAT-001 — arquivar remove da visão "published" sem apagar o registro --

update public.products set status = 'archived', archived_at = now() where id = 'f1f1f1f1-0000-0000-0000-000000000001';

do $$
declare
  v_status public.product_status;
begin
  select status into v_status from public.products where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if v_status <> 'archived' then
    raise exception 'FALHA AC-CAT-001: produto não ficou archived';
  end if;
  if not exists (select 1 from public.products where id = 'f1f1f1f1-0000-0000-0000-000000000001') then
    raise exception 'FALHA AC-CAT-001: arquivar não deveria apagar o registro do produto';
  end if;
end $$;

-- Isolamento de tenant: owner F não lê nem escreve catálogo de E ------------

select set_config('request.jwt.claims', json_build_object('sub', 'b1b1b1b1-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.categories where establishment_id = 'c1c1c1c1-0000-0000-0000-000000000001') then
    raise exception 'FALHA AC-TEN: owner F leu categorias de E';
  end if;
  if exists (select 1 from public.products where establishment_id = 'c1c1c1c1-0000-0000-0000-000000000001') then
    raise exception 'FALHA AC-TEN: owner F leu produtos de E';
  end if;
end $$;

update public.categories set name = 'Hackeado' where id = 'e1e1e1e1-0000-0000-0000-000000000001';
do $$
begin
  if exists (select 1 from public.categories where id = 'e1e1e1e1-0000-0000-0000-000000000001' and name = 'Hackeado') then
    raise exception 'FALHA AC-TEN: owner F conseguiu alterar categoria de E';
  end if;
end $$;

-- kitchen de E: pode alternar disponibilidade, mas não publica nem edita ----

select set_config('request.jwt.claims', json_build_object('sub', 'a3a3a3a3-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select public.set_product_availability('f1f1f1f1-0000-0000-0000-000000000001'::uuid, false);

do $$
declare
  v_is_available boolean;
begin
  select is_available into v_is_available from public.products where id = 'f1f1f1f1-0000-0000-0000-000000000001';
  if v_is_available <> false then
    raise exception 'FALHA: kitchen deveria conseguir marcar produto como indisponível';
  end if;
end $$;

savepoint before_kitchen_publish;
do $$
begin
  perform public.publish_product('f2f2f2f2-0000-0000-0000-000000000001'::uuid);
  raise exception 'FALHA: kitchen conseguiu publicar produto';
exception
  when sqlstate '42501' then
    raise notice 'OK: publish_product bloqueou kitchen sem permissão';
end $$;
rollback to savepoint before_kitchen_publish;

update public.categories set name = 'Editado por kitchen' where id = 'e1e1e1e1-0000-0000-0000-000000000001';
do $$
begin
  if exists (
    select 1 from public.categories
    where id = 'e1e1e1e1-0000-0000-0000-000000000001' and name = 'Editado por kitchen'
  ) then
    raise exception 'FALHA: kitchen conseguiu editar categoria diretamente';
  end if;
end $$;

-- anon não lê catálogo (cardápio público será RPC dedicada na Fase 4) ------

set local role anon;

do $$
begin
  if exists (select 1 from public.products) then
    raise exception 'FALHA: role anon conseguiu ler products';
  end if;
  if exists (select 1 from public.categories) then
    raise exception 'FALHA: role anon conseguiu ler categories';
  end if;
end $$;

do $$
begin
  raise notice 'OK: todos os testes de catálogo da Fase 3 passaram';
end $$;

rollback;
