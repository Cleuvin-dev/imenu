-- Testes de isolamento multi-tenant e RLS da Fase 1.
-- Cobre AC-TEN-001, AC-ROLE-001, AC-PLAT-001 e a guarda do último owner
-- ativo (docs/02_PERSONAS_PAPEIS_E_PERMISSOES.md, regra 4).
--
-- Este script não depende de nenhuma tabela/dados pré-existentes e nunca
-- confirma (COMMIT) suas alterações: tudo roda dentro de uma transação que
-- termina em ROLLBACK, então é seguro executar contra qualquer ambiente
-- (inclusive um projeto de desenvolvimento compartilhado).
--
-- Como executar:
--   - via SQL editor do Supabase ou `psql`: cole o arquivo inteiro;
--   - via CLI local (quando Docker/Supabase estiverem disponíveis):
--       supabase db execute --file supabase/tests/0001_identity_tenancy_rls.sql
--   - via MCP do Supabase: execute_sql com o conteúdo do arquivo.
--
-- Cada bloco `do $$ ... $$` levanta uma exceção com prefixo "FALHA" se a
-- policy correspondente não se comportar como esperado; a transação é
-- abortada e nada é persistido.

begin;

-- Fixtures ------------------------------------------------------------
-- auth.users é gravado com o papel de conexão padrão (dono das migrações);
-- as tabelas public.* usam service_role (BYPASSRLS), do mesmo jeito que o
-- bootstrap real (lib/supabase/admin.ts) cria o owner inicial de um
-- estabelecimento.

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'owner-a@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'manager-a@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'kitchen-a@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('bbbbbbbb-0000-0000-0000-000000000001', 'owner-b@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('cccccccc-0000-0000-0000-000000000001', 'super-admin@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('dddddddd-0000-0000-0000-000000000001', 'sem-vinculo@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');
-- profiles são criados automaticamente pela trigger on_auth_user_created.

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug)
values
  ('11111111-0000-0000-0000-000000000001', 'Estabelecimento A LTDA', 'Estabelecimento A', 'rls-test-estabelecimento-a'),
  ('22222222-0000-0000-0000-000000000001', 'Estabelecimento B LTDA', 'Estabelecimento B', 'rls-test-estabelecimento-b');

insert into public.establishment_members (establishment_id, user_id, role)
values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000002', 'manager'),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000003', 'kitchen'),
  ('22222222-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'owner');

insert into public.platform_admins (user_id, role)
values ('cccccccc-0000-0000-0000-000000000001', 'super_admin');

-- AC-TEN-001 — owner do tenant A não lê nem altera tenant B -----------------

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.establishments where id = '22222222-0000-0000-0000-000000000001') then
    raise exception 'FALHA AC-TEN-001: owner A conseguiu ler establishment B';
  end if;

  if exists (select 1 from public.establishment_members where establishment_id = '22222222-0000-0000-0000-000000000001') then
    raise exception 'FALHA AC-TEN-001: owner A conseguiu ler establishment_members de B';
  end if;
end $$;

update public.establishments set trade_name = 'Hackeado' where id = '22222222-0000-0000-0000-000000000001';

do $$
begin
  if exists (
    select 1 from public.establishments
    where id = '22222222-0000-0000-0000-000000000001' and trade_name = 'Hackeado'
  ) then
    raise exception 'FALHA AC-TEN-001: owner A conseguiu alterar establishment B via UPDATE cruzado';
  end if;
end $$;

-- Owner A tem acesso normal ao próprio tenant (controle positivo).
update public.establishments set accepting_orders = false where id = '11111111-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1 from public.establishments
    where id = '11111111-0000-0000-0000-000000000001' and accepting_orders = false
  ) then
    raise exception 'FALHA controle positivo: owner A deveria conseguir atualizar o próprio estabelecimento';
  end if;
end $$;

-- AC-ROLE-001 — kitchen não edita membro nem configuração do estabelecimento

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000003', 'role', 'authenticated')::text, true);
set local role authenticated;

update public.establishments set accepting_orders = true where id = '11111111-0000-0000-0000-000000000001';
update public.establishment_members set role = 'viewer' where user_id = 'aaaaaaaa-0000-0000-0000-000000000002';

do $$
begin
  if exists (
    select 1 from public.establishments
    where id = '11111111-0000-0000-0000-000000000001' and accepting_orders = true
  ) then
    raise exception 'FALHA AC-ROLE-001: kitchen conseguiu alterar configuração do estabelecimento';
  end if;

  if exists (
    select 1 from public.establishment_members
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000002' and role = 'viewer'
  ) then
    raise exception 'FALHA AC-ROLE-001: kitchen conseguiu alterar o papel de outro membro';
  end if;
end $$;

-- Manager: pode configurar o estabelecimento, mas não mexe na linha do owner

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000002', 'role', 'authenticated')::text, true);
set local role authenticated;

update public.establishments set accepting_orders = false where id = '11111111-0000-0000-0000-000000000001';

do $$
begin
  if not exists (
    select 1 from public.establishments
    where id = '11111111-0000-0000-0000-000000000001' and accepting_orders = false
  ) then
    raise exception 'FALHA controle positivo: manager A deveria conseguir configurar o próprio estabelecimento';
  end if;
end $$;

-- Tentativa de desativar a linha do owner: USING já filtra a linha (0 linhas
-- afetadas, sem erro), pois a condição do gerente exige role <> 'owner'.
update public.establishment_members set is_active = false where user_id = 'aaaaaaaa-0000-0000-0000-000000000001';

do $$
begin
  if exists (
    select 1 from public.establishment_members
    where user_id = 'aaaaaaaa-0000-0000-0000-000000000001' and is_active = false
  ) then
    raise exception 'FALHA regra 4: manager conseguiu desativar a linha do owner';
  end if;
end $$;

-- Tentativa de promover kitchen a owner: a linha passa no USING (papel atual
-- ainda é 'kitchen'), mas o WITH CHECK rejeita o novo valor 'owner' — Postgres
-- levanta 42501 nesse caso, em vez de simplesmente afetar 0 linhas.
savepoint before_promote_attempt;

do $$
begin
  update public.establishment_members set role = 'owner' where user_id = 'aaaaaaaa-0000-0000-0000-000000000003';
  raise exception 'FALHA regra 4: manager conseguiu promover alguém a owner';
exception
  when insufficient_privilege then
    raise notice 'OK: manager não conseguiu promover kitchen a owner (bloqueado por RLS)';
end $$;

rollback to savepoint before_promote_attempt;

-- Guarda de último owner ativo: nem o próprio owner consegue se remover ----

select set_config('request.jwt.claims', json_build_object('sub', 'aaaaaaaa-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

savepoint before_last_owner_guard;

do $$
begin
  update public.establishment_members
  set is_active = false
  where establishment_id = '11111111-0000-0000-0000-000000000001' and role = 'owner';

  raise exception 'FALHA regra 4: guarda de último owner não bloqueou a autodesativação';
exception
  when sqlstate '23514' then
    raise notice 'OK: guarda de último owner bloqueou a autodesativação como esperado';
end $$;

rollback to savepoint before_last_owner_guard;

-- AC-PLAT-001 — usuário sem platform_admins não acessa dados de plataforma --

select set_config('request.jwt.claims', json_build_object('sub', 'dddddddd-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if exists (select 1 from public.platform_admins) then
    raise exception 'FALHA AC-PLAT-001: usuário sem vínculo leu platform_admins';
  end if;

  if exists (select 1 from public.establishments) then
    raise exception 'FALHA AC-PLAT-001: usuário sem vínculo leu establishments';
  end if;
end $$;

-- Superadmin enxerga estabelecimentos de qualquer tenant -------------------

select set_config('request.jwt.claims', json_build_object('sub', 'cccccccc-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  if (select count(*) from public.establishments where id in (
    '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001'
  )) <> 2 then
    raise exception 'FALHA AC-PLAT-001: super_admin deveria ler establishments de qualquer tenant';
  end if;
end $$;

-- anon não seleciona nenhuma tabela interna --------------------------------
-- Nenhuma policy destas tabelas é `to authenticated` para o papel anon, então
-- a simples troca de role já basta para negar acesso por padrão.

set local role anon;

do $$
begin
  if exists (select 1 from public.establishments) then
    raise exception 'FALHA: role anon conseguiu ler establishments';
  end if;

  if exists (select 1 from public.establishment_members) then
    raise exception 'FALHA: role anon conseguiu ler establishment_members';
  end if;

  if exists (select 1 from public.profiles) then
    raise exception 'FALHA: role anon conseguiu ler profiles';
  end if;
end $$;

do $$
begin
  raise notice 'OK: todos os testes de isolamento multi-tenant e RLS da Fase 1 passaram';
end $$;

rollback;
