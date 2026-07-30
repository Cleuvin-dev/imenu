-- Fase 2 — Correção de privilégios das funções de cobrança.
-- Funções novas recebem GRANT EXECUTE TO PUBLIC por padrão do Supabase, o
-- que anula qualquer "revoke ... from anon/authenticated" feito na criação:
-- PUBLIC cobre todos os papéis independentemente de revokes nomeados.
-- Aqui revogamos de PUBLIC explicitamente e regrantamos só aos papéis
-- corretos (mesma lição já aplicada aos gatilhos/helpers na Fase 1).

revoke all on function public.evaluate_establishment_access(uuid) from public;
grant execute on function public.evaluate_establishment_access(uuid) to anon, authenticated;

revoke all on function public.process_overdue_subscriptions(timestamptz) from public;
grant execute on function public.process_overdue_subscriptions(timestamptz) to service_role;

revoke all on function public.confirm_invoice_payment(uuid, integer, timestamptz, public.payment_method, text, text) from public;
grant execute on function public.confirm_invoice_payment(uuid, integer, timestamptz, public.payment_method, text, text) to authenticated;

revoke all on function public.reverse_payment(uuid, text) from public;
grant execute on function public.reverse_payment(uuid, text) to authenticated;
