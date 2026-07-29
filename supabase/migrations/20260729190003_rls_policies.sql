-- Fase 1 — Políticas RLS para profiles, platform_admins, establishments,
-- establishment_members e member_invites.
-- Nenhuma política depende de establishment_id enviado pelo cliente; toda
-- decisão deriva de establishment_members/platform_admins consultados no
-- servidor via auth.uid().

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

alter table public.platform_admins enable row level security;
alter table public.platform_admins force row level security;

alter table public.establishments enable row level security;
alter table public.establishments force row level security;

alter table public.establishment_members enable row level security;
alter table public.establishment_members force row level security;

alter table public.member_invites enable row level security;
alter table public.member_invites force row level security;

-- profiles ----------------------------------------------------------------
-- Leitura/edição restritas ao próprio perfil, ou leitura por administrador da
-- plataforma. Listagem de colegas de equipe é resolvida via RPC dedicada na
-- Fase 8, não por policy ampla nesta tabela.

create policy profiles_select_self_or_platform_admin
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_platform_admin(null)
  );

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- platform_admins -----------------------------------------------------------
-- Somente super_admin gerencia administradores da plataforma; qualquer
-- administrador ativo pode ler a própria linha ou a lista completa.

create policy platform_admins_select_self_or_admin
  on public.platform_admins
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_platform_admin(null)
  );

create policy platform_admins_manage_by_super_admin
  on public.platform_admins
  for all
  to authenticated
  using (public.is_platform_admin(array['super_admin']::public.platform_role[]))
  with check (public.is_platform_admin(array['super_admin']::public.platform_role[]));

-- establishments --------------------------------------------------------

create policy establishments_select_member_or_platform_admin
  on public.establishments
  for select
  to authenticated
  using (
    public.is_active_member(id)
    or public.is_platform_admin(null)
  );

create policy establishments_insert_platform_admin
  on public.establishments
  for insert
  to authenticated
  with check (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy establishments_update_manager_or_platform_admin
  on public.establishments
  for update
  to authenticated
  using (
    public.has_tenant_role(id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- establishment_members -----------------------------------------------------
-- Criação de membros ocorre apenas por rotina de servidor privilegiada
-- (bootstrap do owner inicial, aceite de convite) usando o cliente
-- administrativo, que ignora RLS por padrão — por isso não existe policy de
-- insert para o papel authenticated. Gerentes não podem alterar/remover a
-- linha de um owner nem promover alguém a owner (bloqueado no WITH CHECK).

create policy establishment_members_select_self_member_or_platform_admin
  on public.establishment_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_active_member(establishment_id)
    or public.is_platform_admin(null)
  );

create policy establishment_members_update_owner_or_manager
  on public.establishment_members
  for update
  to authenticated
  using (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
    or public.has_tenant_role(establishment_id, array['owner']::public.member_role[])
    or (
      public.has_tenant_role(establishment_id, array['manager']::public.member_role[])
      and role <> 'owner'
    )
  )
  with check (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
    or public.has_tenant_role(establishment_id, array['owner']::public.member_role[])
    or (
      public.has_tenant_role(establishment_id, array['manager']::public.member_role[])
      and role <> 'owner'
    )
  );

create policy establishment_members_delete_owner_or_manager
  on public.establishment_members
  for delete
  to authenticated
  using (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
    or public.has_tenant_role(establishment_id, array['owner']::public.member_role[])
    or (
      public.has_tenant_role(establishment_id, array['manager']::public.member_role[])
      and role <> 'owner'
    )
  );

-- member_invites ----------------------------------------------------------
-- Leitura e gestão restritas a owner/manager do próprio tenant ou admin da
-- plataforma. Aceite de convite (definir accepted_at e criar a associação) é
-- uma rotina de servidor privilegiada da Fase 8, não uma policy de update
-- aberta ao convidado.

create policy member_invites_select_owner_manager_or_platform_admin
  on public.member_invites
  for select
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  );

create policy member_invites_insert_owner_manager_or_platform_admin
  on public.member_invites
  for insert
  to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy member_invites_update_owner_manager_or_platform_admin
  on public.member_invites
  for update
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );
