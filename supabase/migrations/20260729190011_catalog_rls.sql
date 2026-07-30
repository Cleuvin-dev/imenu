-- Fase 3 — Políticas RLS do catálogo (docs/02, matriz de permissões).
-- Nenhuma tabela desta fase tem policy para anon: o cardápio público lê por
-- uma RPC de leitura limitada que será criada na Fase 4 (docs/07 §11), nunca
-- por select direto nestas tabelas.
--
-- Cada tabela usa uma policy de SELECT ampla (qualquer membro ativo) e
-- policies de INSERT/UPDATE/DELETE separadas e mais restritas — em vez de
-- "for all" — para não empilhar policies permissivas redundantes na mesma
-- operação (lição da Fase 1/2 com o advisor de performance).

alter table public.categories enable row level security;
alter table public.categories force row level security;

alter table public.products enable row level security;
alter table public.products force row level security;

alter table public.product_media enable row level security;
alter table public.product_media force row level security;

alter table public.option_groups enable row level security;
alter table public.option_groups force row level security;

alter table public.options enable row level security;
alter table public.options force row level security;

alter table public.product_option_groups enable row level security;
alter table public.product_option_groups force row level security;

alter table public.business_hours enable row level security;
alter table public.business_hours force row level security;

alter table public.business_hour_exceptions enable row level security;
alter table public.business_hour_exceptions force row level security;

-- categories ------------------------------------------------------------

create policy categories_select_member_or_platform_admin
  on public.categories for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy categories_insert_owner_manager_menu_editor
  on public.categories for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy categories_update_owner_manager_menu_editor
  on public.categories for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy categories_delete_owner_manager_menu_editor
  on public.categories for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- products ----------------------------------------------------------------
-- Kitchen/cashier têm apenas leitura aqui; a alternância rápida de
-- disponibilidade (matriz: "O") é feita pela função set_product_availability,
-- não por UPDATE direto via RLS.

create policy products_select_member_or_platform_admin
  on public.products for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy products_insert_owner_manager_menu_editor
  on public.products for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy products_update_owner_manager_menu_editor
  on public.products for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy products_delete_owner_manager_menu_editor
  on public.products for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- product_media -------------------------------------------------------------

create policy product_media_select_member_or_platform_admin
  on public.product_media for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy product_media_insert_owner_manager_menu_editor
  on public.product_media for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy product_media_update_owner_manager_menu_editor
  on public.product_media for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy product_media_delete_owner_manager_menu_editor
  on public.product_media for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- option_groups -------------------------------------------------------------

create policy option_groups_select_member_or_platform_admin
  on public.option_groups for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy option_groups_insert_owner_manager_menu_editor
  on public.option_groups for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy option_groups_update_owner_manager_menu_editor
  on public.option_groups for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy option_groups_delete_owner_manager_menu_editor
  on public.option_groups for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- options -------------------------------------------------------------------

create policy options_select_member_or_platform_admin
  on public.options for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy options_insert_owner_manager_menu_editor
  on public.options for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy options_update_owner_manager_menu_editor
  on public.options for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy options_delete_owner_manager_menu_editor
  on public.options for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- product_option_groups ------------------------------------------------------

create policy product_option_groups_select_member_or_platform_admin
  on public.product_option_groups for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy product_option_groups_insert_owner_manager_menu_editor
  on public.product_option_groups for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy product_option_groups_update_owner_manager_menu_editor
  on public.product_option_groups for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy product_option_groups_delete_owner_manager_menu_editor
  on public.product_option_groups for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

-- business_hours / business_hour_exceptions ---------------------------------
-- Escopo da Fase 3 é só schema + RLS; a tela de configuração (E-08) é da
-- Fase 8. Escrita restrita a owner/manager (matriz "Horários/pausar
-- pedidos"); o toggle rápido de "aceitar pedidos" pelo caixa usa
-- establishments.accepting_orders, já coberto pela Fase 1, não esta tabela.

create policy business_hours_select_member_or_platform_admin
  on public.business_hours for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy business_hours_insert_owner_manager
  on public.business_hours for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy business_hours_update_owner_manager
  on public.business_hours for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy business_hours_delete_owner_manager
  on public.business_hours for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy business_hour_exceptions_select_member_or_platform_admin
  on public.business_hour_exceptions for select to authenticated
  using (public.is_active_member(establishment_id) or public.is_platform_admin(null));

create policy business_hour_exceptions_insert_owner_manager
  on public.business_hour_exceptions for insert to authenticated
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy business_hour_exceptions_update_owner_manager
  on public.business_hour_exceptions for update to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  )
  with check (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );

create policy business_hour_exceptions_delete_owner_manager
  on public.business_hour_exceptions for delete to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
  );
