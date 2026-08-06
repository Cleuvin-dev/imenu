-- Testes da Fase 8 — convites de equipe e administradores da plataforma
-- (docs/02 §6, docs/03 RF-EST-012/RF-ADM-014). Mesmo formato dos testes
-- anteriores: tudo roda em uma transação com ROLLBACK final, nunca persiste
-- dados.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, aud, role)
values
  ('77770000-1111-0000-0000-000000000001', 'owner-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000002', 'manager-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000003', 'kitchen-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000004', 'invitee-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000005', 'someone-else-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000006', 'super1-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated'),
  ('77770000-1111-0000-0000-000000000007', 'super2-t8@imenu.test', 'x', now(), '{}'::jsonb, 'authenticated', 'authenticated');

set local role service_role;

insert into public.establishments (id, legal_name, trade_name, slug)
values ('77770000-2222-0000-0000-000000000001', 'Estabelecimento T8 LTDA', 'Estabelecimento T8', 'team-test-t8');

insert into public.establishment_members (establishment_id, user_id, role)
values
  ('77770000-2222-0000-0000-000000000001', '77770000-1111-0000-0000-000000000001', 'owner'),
  ('77770000-2222-0000-0000-000000000001', '77770000-1111-0000-0000-000000000002', 'manager'),
  ('77770000-2222-0000-0000-000000000001', '77770000-1111-0000-0000-000000000003', 'kitchen');

insert into public.platform_admins (user_id, role)
values
  ('77770000-1111-0000-0000-000000000006', 'super_admin'),
  ('77770000-1111-0000-0000-000000000007', 'super_admin');

-- ---------------------------------------------------------------------
-- accept_member_invite — fluxo feliz: owner cria convite (insert direto,
-- permitido por RLS desde a Fase 1), convidado aceita.
-- ---------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000001', 'role', 'authenticated')::text, true);
set local role authenticated;

insert into public.member_invites (establishment_id, email, role, token_hash, invited_by, expires_at)
values (
  '77770000-2222-0000-0000-000000000001', 'invitee-t8@imenu.test', 'cashier', 'test-hash-happy-path',
  '77770000-1111-0000-0000-000000000001', now() + interval '72 hours'
);

select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000004', 'role', 'authenticated')::text, true);

do $$
declare
  v_result jsonb;
begin
  v_result := public.accept_member_invite('test-hash-happy-path');
  if (v_result ->> 'role') <> 'cashier' then
    raise exception 'FALHA: accept_member_invite não retornou o papel esperado';
  end if;
end $$;

do $$
begin
  set local role service_role;
  if not exists (
    select 1 from public.establishment_members
    where establishment_id = '77770000-2222-0000-0000-000000000001'
      and user_id = '77770000-1111-0000-0000-000000000004'
      and role = 'cashier'
      and is_active
  ) then
    raise exception 'FALHA: associação do convidado não foi criada com o papel correto';
  end if;
end $$;

-- Reaceitar o mesmo convite falha (IM041 — já utilizado).
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000004', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    perform public.accept_member_invite('test-hash-happy-path');
    raise exception 'FALHA: reaceitar um convite já usado deveria falhar com IM041';
  exception
    when sqlstate 'IM041' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- accept_member_invite — e-mail divergente (IM042).
-- ---------------------------------------------------------------------
set local role service_role;
insert into public.member_invites (establishment_id, email, role, token_hash, invited_by, expires_at)
values (
  '77770000-2222-0000-0000-000000000001', 'nao-e-o-someone-else@imenu.test', 'viewer', 'test-hash-email-mismatch',
  '77770000-1111-0000-0000-000000000001', now() + interval '72 hours'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000005', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    perform public.accept_member_invite('test-hash-email-mismatch');
    raise exception 'FALHA: aceitar convite com e-mail divergente deveria falhar com IM042';
  exception
    when sqlstate 'IM042' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- accept_member_invite — convite revogado (IM040) e expirado (IM040).
-- ---------------------------------------------------------------------
set local role service_role;
insert into public.member_invites (establishment_id, email, role, token_hash, invited_by, expires_at, revoked_at)
values (
  '77770000-2222-0000-0000-000000000001', 'someone-else-t8@imenu.test', 'viewer', 'test-hash-revoked',
  '77770000-1111-0000-0000-000000000001', now() + interval '72 hours', now()
);
insert into public.member_invites (establishment_id, email, role, token_hash, invited_by, expires_at)
values (
  '77770000-2222-0000-0000-000000000001', 'someone-else-t8@imenu.test', 'viewer', 'test-hash-expired',
  '77770000-1111-0000-0000-000000000001', now() - interval '1 hour'
);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000005', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    perform public.accept_member_invite('test-hash-revoked');
    raise exception 'FALHA: aceitar convite revogado deveria falhar com IM040';
  exception
    when sqlstate 'IM040' then null;
  end;

  begin
    perform public.accept_member_invite('test-hash-expired');
    raise exception 'FALHA: aceitar convite expirado deveria falhar com IM040';
  exception
    when sqlstate 'IM040' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- get_member_invite_preview — fail-closed: revogado não distingue de
-- inexistente; convite válido revela só o necessário para a tela.
-- ---------------------------------------------------------------------
do $$
declare
  v_preview jsonb;
begin
  v_preview := public.get_member_invite_preview('test-hash-revoked');
  if (v_preview ->> 'valid')::boolean is distinct from false then
    raise exception 'FALHA: prévia de convite revogado deveria retornar valid:false';
  end if;

  v_preview := public.get_member_invite_preview('token-que-nao-existe');
  if (v_preview ->> 'valid')::boolean is distinct from false then
    raise exception 'FALHA: prévia de token inexistente deveria retornar valid:false';
  end if;
end $$;

set local role service_role;
insert into public.member_invites (establishment_id, email, role, token_hash, invited_by, expires_at)
values (
  '77770000-2222-0000-0000-000000000001', 'preview-t8@imenu.test', 'menu_editor', 'test-hash-preview-valid',
  '77770000-1111-0000-0000-000000000001', now() + interval '72 hours'
);
set local role anon;

do $$
declare
  v_preview jsonb;
begin
  v_preview := public.get_member_invite_preview('test-hash-preview-valid');
  if (v_preview ->> 'valid')::boolean is distinct from true or (v_preview ->> 'role') <> 'menu_editor' then
    raise exception 'FALHA: prévia de convite válido deveria retornar valid:true com o papel correto';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- list_establishment_team — só owner/manager (ou platform admin); kitchen
-- é barrado com 42501.
-- ---------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000002', 'role', 'authenticated')::text, true);

do $$
declare
  v_team jsonb;
begin
  v_team := public.list_establishment_team('77770000-2222-0000-0000-000000000001');
  if jsonb_array_length(v_team) < 4 then
    raise exception 'FALHA: manager deveria ver ao menos os 4 membros já criados nesta transação';
  end if;
end $$;

select set_config('request.jwt.claims', json_build_object('sub', '77770000-1111-0000-0000-000000000003', 'role', 'authenticated')::text, true);

do $$
begin
  begin
    perform public.list_establishment_team('77770000-2222-0000-0000-000000000001');
    raise exception 'FALHA: kitchen não deveria conseguir listar a equipe';
  exception
    when sqlstate '42501' then null;
  end;
end $$;

-- ---------------------------------------------------------------------
-- enforce_last_super_admin_guard — com dois super_admins ativos, rebaixar
-- um é permitido; rebaixar/desativar o último ativo falha (23514).
--
-- O guard conta super_admins ativos em toda a tabela (sem escopo de
-- tenant, ao contrário do guard de owner) — por isso, num banco de
-- desenvolvimento compartilhado que já pode ter super_admins reais (ex.:
-- conta de demonstração), neutralizamos temporariamente qualquer outro
-- super_admin ativo dentro desta mesma transação (nunca persiste, termina
-- em ROLLBACK) para que a contagem do teste fique determinística.
-- ---------------------------------------------------------------------
set local role service_role;

update public.platform_admins
  set is_active = false
  where role = 'super_admin'
    and is_active
    and user_id not in ('77770000-1111-0000-0000-000000000006', '77770000-1111-0000-0000-000000000007');

update public.platform_admins set role = 'platform_admin' where user_id = '77770000-1111-0000-0000-000000000006';

do $$
begin
  if exists (select 1 from public.platform_admins where user_id = '77770000-1111-0000-0000-000000000006' and role = 'super_admin') then
    raise exception 'FALHA: rebaixar um super_admin quando existe outro ativo deveria ter sido permitido';
  end if;
end $$;

do $$
begin
  begin
    update public.platform_admins set is_active = false where user_id = '77770000-1111-0000-0000-000000000007';
    raise exception 'FALHA: desativar o último super_admin ativo deveria falhar com 23514';
  exception
    when sqlstate '23514' then null;
  end;
end $$;

do $$
begin
  begin
    delete from public.platform_admins where user_id = '77770000-1111-0000-0000-000000000007';
    raise exception 'FALHA: remover o último super_admin ativo deveria falhar com 23514';
  exception
    when sqlstate '23514' then null;
  end;
end $$;

rollback;
