-- Testes de assinatura e gate de acesso da Fase 2.
-- Cobre AC-SUB-001 (suspensão por atraso), AC-SUB-002 (preservação),
-- AC-SUB-003 (reativação por pagamento) e AC-SUB-004 (prazo adicional).
--
-- Mesmo formato do teste da Fase 1: tudo roda em uma transação que termina
-- em ROLLBACK, então é seguro executar contra qualquer ambiente.
--
-- Como executar: ver cabeçalho de 0001_identity_tenancy_rls.sql.

begin;

-- Fixtures ------------------------------------------------------------

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('eeeeeeee-0000-0000-0000-000000000001', 'owner-c@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('ffffffff-0000-0000-0000-000000000001', 'super-admin-billing@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('12121212-0000-0000-0000-000000000001', 'sem-permissao-billing@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.platform_admins (user_id, role)
values ('ffffffff-0000-0000-0000-000000000001', 'super_admin');

insert into public.plans (id, code, name, price_cents)
values ('33333333-0000-0000-0000-000000000001', 'essencial-test', 'Essencial (teste)', 9900);

insert into public.establishments (id, legal_name, trade_name, slug)
values
  ('44444444-0000-0000-0000-000000000001', 'Estabelecimento C LTDA', 'Estabelecimento C', 'rls-test-estabelecimento-c'),
  ('55555555-0000-0000-0000-000000000001', 'Estabelecimento D LTDA', 'Estabelecimento D', 'rls-test-estabelecimento-d');

insert into public.establishment_members (establishment_id, user_id, role)
values ('44444444-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000001', 'owner');

insert into public.subscriptions (id, establishment_id, plan_id, status, current_period_start, current_period_end)
values
  ('66666666-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'active', now() - interval '20 days', now() + interval '10 days'),
  ('77777777-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'active', now() - interval '20 days', now() + interval '10 days');

-- D tem prazo adicional vigente (grace_until no futuro).
update public.subscriptions set grace_until = now() + interval '5 days' where id = '77777777-0000-0000-0000-000000000001';

insert into public.invoices (id, establishment_id, subscription_id, reference_period_start, reference_period_end, amount_cents, status, due_at)
values
  ('88888888-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', (current_date - interval '30 days')::date, current_date, 9900, 'open', now() - interval '1 day'),
  ('99999999-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', '77777777-0000-0000-0000-000000000001', (current_date - interval '30 days')::date, current_date, 9900, 'open', now() - interval '1 day');

-- AC-SUB-001 — job de inadimplência suspende C -----------------------------

select public.process_overdue_subscriptions(now());

do $$
declare
  v_invoice_status public.invoice_status;
  v_sub_status public.subscription_status;
begin
  select status into v_invoice_status from public.invoices where id = '88888888-0000-0000-0000-000000000001';
  select status into v_sub_status from public.subscriptions where id = '66666666-0000-0000-0000-000000000001';

  if v_invoice_status <> 'overdue' then
    raise exception 'FALHA AC-SUB-001: fatura de C não ficou overdue (status=%)', v_invoice_status;
  end if;
  if v_sub_status <> 'suspended' then
    raise exception 'FALHA AC-SUB-001: assinatura de C não ficou suspended (status=%)', v_sub_status;
  end if;
end $$;

-- AC-SUB-004 (parte 1) — D com prazo vigente vira past_due, não suspende ---

do $$
declare
  v_sub_status public.subscription_status;
begin
  select status into v_sub_status from public.subscriptions where id = '77777777-0000-0000-0000-000000000001';
  if v_sub_status <> 'past_due' then
    raise exception 'FALHA AC-SUB-004: assinatura de D deveria estar past_due com prazo vigente (status=%)', v_sub_status;
  end if;
end $$;

-- AC-SUB-002 — preservação: nada além da assinatura foi tocado ------------

do $$
begin
  if not exists (
    select 1 from public.establishments where id = '44444444-0000-0000-0000-000000000001' and is_active = true
  ) then
    raise exception 'FALHA AC-SUB-002: establishment C não deveria ter sido desativado pela suspensão';
  end if;

  if not exists (
    select 1 from public.establishment_members
    where establishment_id = '44444444-0000-0000-0000-000000000001' and role = 'owner' and is_active = true
  ) then
    raise exception 'FALHA AC-SUB-002: a equipe de C não deveria ter sido alterada pela suspensão';
  end if;
end $$;

-- Gate público (RPC usada pelo cardápio/painel) reflete C bloqueado e D livre

set local role anon;

do $$
declare
  v_result_c jsonb;
  v_result_d jsonb;
begin
  v_result_c := public.evaluate_establishment_access('44444444-0000-0000-0000-000000000001');
  if (v_result_c ->> 'allowed')::boolean <> false then
    raise exception 'FALHA AC-SUB-001: evaluate_establishment_access deveria bloquear C, retornou %', v_result_c;
  end if;

  v_result_d := public.evaluate_establishment_access('55555555-0000-0000-0000-000000000001');
  if (v_result_d ->> 'allowed')::boolean <> true then
    raise exception 'FALHA AC-SUB-004: evaluate_establishment_access deveria liberar D (prazo vigente), retornou %', v_result_d;
  end if;
end $$;

-- AC-SUB-003 — confirmação de pagamento reativa C --------------------------

select set_config('request.jwt.claims', json_build_object('sub', 'ffffffff-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

select public.confirm_invoice_payment(
  '88888888-0000-0000-0000-000000000001'::uuid,
  9900,
  now(),
  'pix'::public.payment_method,
  'comprovante-teste',
  null
);

do $$
declare
  v_invoice_status public.invoice_status;
  v_sub_status public.subscription_status;
begin
  select status into v_invoice_status from public.invoices where id = '88888888-0000-0000-0000-000000000001';
  select status into v_sub_status from public.subscriptions where id = '66666666-0000-0000-0000-000000000001';

  if v_invoice_status <> 'paid' then
    raise exception 'FALHA AC-SUB-003: fatura de C deveria estar paid (status=%)', v_invoice_status;
  end if;
  if v_sub_status <> 'active' then
    raise exception 'FALHA AC-SUB-003: assinatura de C deveria voltar a active (status=%)', v_sub_status;
  end if;
end $$;

set local role anon;

do $$
declare
  v_result_c jsonb;
begin
  v_result_c := public.evaluate_establishment_access('44444444-0000-0000-0000-000000000001');
  if (v_result_c ->> 'allowed')::boolean <> true then
    raise exception 'FALHA AC-SUB-003: evaluate_establishment_access deveria liberar C após o pagamento, retornou %', v_result_c;
  end if;
end $$;

-- AC-SUB-004 (parte 2) — prazo expira, job suspende D ----------------------

set local role service_role;

update public.subscriptions set grace_until = now() - interval '1 hour' where id = '77777777-0000-0000-0000-000000000001';

select public.process_overdue_subscriptions(now());

do $$
declare
  v_sub_status public.subscription_status;
begin
  select status into v_sub_status from public.subscriptions where id = '77777777-0000-0000-0000-000000000001';
  if v_sub_status <> 'suspended' then
    raise exception 'FALHA AC-SUB-004: assinatura de D deveria suspender após o prazo adicional expirar (status=%)', v_sub_status;
  end if;
end $$;

-- Controle negativo: usuário autenticado comum não confirma pagamento ------

select set_config('request.jwt.claims', json_build_object('sub', '12121212-0000-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.confirm_invoice_payment('99999999-0000-0000-0000-000000000001'::uuid, 9900, now(), 'pix'::public.payment_method, null, null);
  raise exception 'FALHA: usuário sem permissão de plataforma conseguiu confirmar pagamento';
exception
  when sqlstate '42501' then
    raise notice 'OK: confirm_invoice_payment bloqueou usuário sem permissão de plataforma';
end $$;

do $$
begin
  raise notice 'OK: todos os testes de assinatura e gate de acesso da Fase 2 passaram';
end $$;

rollback;
