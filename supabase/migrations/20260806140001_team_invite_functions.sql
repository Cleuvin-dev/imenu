-- Fase 8 — Funções de convite de equipe (docs/02 §6, docs/03 RF-EST-012,
-- docs/07 member_invites). A criação e a revogação de convite usam o
-- cliente autenticado normal (RLS de member_invites já permite insert/update
-- para owner/manager desde a Fase 1) — só o aceite e a prévia pública
-- precisam de SECURITY DEFINER, porque quem aceita ainda não é membro do
-- tenant e não pode ler/gravar essas tabelas via RLS comum.

-- get_member_invite_preview: leitura pública fail-closed pelo hash do token,
-- para exibir "convite de {estabelecimento}" antes do login/cadastro, sem
-- distinguir convite inexistente de expirado/revogado/aceito (evita
-- enumeração, mesmo padrão de get_public_order/get_table_bill_status).
create or replace function public.get_member_invite_preview(p_token_hash text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_invite record;
begin
  select mi.email, mi.role, mi.expires_at, mi.accepted_at, mi.revoked_at, e.trade_name
    into v_invite
    from public.member_invites mi
    join public.establishments e on e.id = mi.establishment_id
    where mi.token_hash = p_token_hash;

  if not found
    or v_invite.accepted_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at < now()
  then
    return jsonb_build_object('valid', false);
  end if;

  return jsonb_build_object(
    'valid', true,
    'email', v_invite.email,
    'role', v_invite.role,
    'establishmentTradeName', v_invite.trade_name,
    'expiresAt', v_invite.expires_at
  );
end;
$$;

revoke all on function public.get_member_invite_preview(text) from public;
grant execute on function public.get_member_invite_preview(text) to anon, authenticated;

-- accept_member_invite: só authenticated. Valida token, expiração, revogação
-- e correspondência de e-mail (docs/02 §6, regra 6) inteiramente no
-- servidor; cria/reativa a associação e consome o convite numa transação.
create or replace function public.accept_member_invite(p_token_hash text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite record;
  v_caller_email extensions.citext;
  v_establishment record;
begin
  if auth.uid() is null then
    raise exception 'accept_member_invite: autenticação obrigatória' using errcode = '42501';
  end if;

  select * into v_invite
    from public.member_invites
    where token_hash = p_token_hash
    for update;

  if not found or v_invite.revoked_at is not null or v_invite.expires_at < now() then
    raise exception 'accept_member_invite: convite inválido, revogado ou expirado' using errcode = 'IM040';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'accept_member_invite: convite já foi utilizado' using errcode = 'IM041';
  end if;

  select email into v_caller_email from public.profiles where id = auth.uid();

  if v_caller_email is null or v_caller_email <> v_invite.email then
    raise exception 'accept_member_invite: e-mail autenticado não corresponde ao convite' using errcode = 'IM042';
  end if;

  insert into public.establishment_members (establishment_id, user_id, role, is_active, invited_by)
  values (v_invite.establishment_id, auth.uid(), v_invite.role, true, v_invite.invited_by)
  on conflict (establishment_id, user_id)
  do update set role = excluded.role, is_active = true, updated_at = now();

  update public.member_invites set accepted_at = now() where id = v_invite.id;

  select trade_name, slug into v_establishment from public.establishments where id = v_invite.establishment_id;

  insert into public.audit_logs (actor_user_id, actor_scope, establishment_id, action, resource_type, resource_id, after_data)
  values (
    auth.uid(), 'establishment', v_invite.establishment_id, 'member.invite_accept', 'establishment_member',
    v_invite.id::text, jsonb_build_object('role', v_invite.role)
  );

  return jsonb_build_object(
    'establishmentId', v_invite.establishment_id,
    'establishmentSlug', v_establishment.slug,
    'establishmentTradeName', v_establishment.trade_name,
    'role', v_invite.role
  );
end;
$$;

revoke all on function public.accept_member_invite(text) from public, anon;
grant execute on function public.accept_member_invite(text) to authenticated;

-- list_establishment_team: junta establishment_members com profiles
-- (display_name/email), que a RLS de profiles não deixa ler diretamente
-- (só o próprio ou platform admin). Restrito a owner/manager do tenant ou
-- platform admin, verificado internamente.
create or replace function public.list_establishment_team(p_establishment_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_members jsonb;
begin
  if not (
    public.has_tenant_role(p_establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  ) then
    raise exception 'list_establishment_team: sem permissão' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.id,
    'userId', m.user_id,
    'displayName', p.display_name,
    'email', p.email,
    'role', m.role,
    'isActive', m.is_active,
    'createdAt', m.created_at
  ) order by m.created_at), '[]'::jsonb)
  into v_members
  from public.establishment_members m
  join public.profiles p on p.id = m.user_id
  where m.establishment_id = p_establishment_id;

  return v_members;
end;
$$;

revoke all on function public.list_establishment_team(uuid) from public, anon;
grant execute on function public.list_establishment_team(uuid) to authenticated;
