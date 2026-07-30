-- Fase 2 — Políticas RLS de cobrança e auditoria.
-- Visibilidade de faturamento restrita a owner/manager do tenant (docs/02,
-- matriz "Assinatura/faturas") ou administrador da plataforma. Escrita de
-- payments/subscription_events/audit_logs só ocorre via funções SECURITY
-- DEFINER (nenhuma policy de INSERT/UPDATE/DELETE para authenticated).

alter table public.plans enable row level security;
alter table public.plans force row level security;

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;

alter table public.invoices enable row level security;
alter table public.invoices force row level security;

alter table public.payments enable row level security;
alter table public.payments force row level security;

alter table public.subscription_events enable row level security;
alter table public.subscription_events force row level security;

alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

-- plans ---------------------------------------------------------------------

create policy plans_select_active_or_platform_admin
  on public.plans
  for select
  to authenticated
  using (
    is_active = true
    or public.is_platform_admin(null)
  );

create policy plans_insert_platform_admin
  on public.plans
  for insert
  to authenticated
  with check (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]));

create policy plans_update_platform_admin
  on public.plans
  for update
  to authenticated
  using (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]))
  with check (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]));

-- subscriptions ---------------------------------------------------------

create policy subscriptions_select_owner_manager_or_platform_admin
  on public.subscriptions
  for select
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  );

create policy subscriptions_insert_platform_admin
  on public.subscriptions
  for insert
  to authenticated
  with check (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]));

create policy subscriptions_update_platform_admin
  on public.subscriptions
  for update
  to authenticated
  using (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]))
  with check (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]));

-- invoices ------------------------------------------------------------------
-- A transição para "paid" é bloqueada mesmo para platform admin via RLS
-- direta: só a função confirm_invoice_payment (SECURITY DEFINER, ignora RLS)
-- pode quitar uma fatura, garantindo que sempre exista um payment associado.

create policy invoices_select_owner_manager_or_platform_admin
  on public.invoices
  for select
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  );

create policy invoices_insert_platform_admin
  on public.invoices
  for insert
  to authenticated
  with check (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
    and status <> 'paid'
  );

create policy invoices_update_platform_admin_except_paid
  on public.invoices
  for update
  to authenticated
  using (public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[]))
  with check (
    public.is_platform_admin(array['super_admin', 'platform_admin']::public.platform_role[])
    and status <> 'paid'
  );

-- payments --------------------------------------------------------------
-- Somente leitura para authenticated; criação/reversão exclusivamente via
-- confirm_invoice_payment/reverse_payment.

create policy payments_select_owner_manager_or_platform_admin
  on public.payments
  for select
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  );

-- subscription_events -----------------------------------------------------
-- Histórico imutável: somente leitura para authenticated.

create policy subscription_events_select_owner_manager_or_platform_admin
  on public.subscription_events
  for select
  to authenticated
  using (
    public.has_tenant_role(establishment_id, array['owner', 'manager']::public.member_role[])
    or public.is_platform_admin(null)
  );

-- audit_logs ----------------------------------------------------------------
-- Sem visão pelo lado do estabelecimento no MVP (matriz de permissões só
-- lista auditoria para o papel de plataforma).

create policy audit_logs_select_platform_admin
  on public.audit_logs
  for select
  to authenticated
  using (public.is_platform_admin(null));
