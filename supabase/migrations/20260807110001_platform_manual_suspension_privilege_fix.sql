-- Corretiva: platform_suspend_establishment/platform_reactivate_establishment
-- ficaram executáveis por `anon` mesmo após "revoke all ... from public" na
-- migração anterior — mesma armadilha documentada em D-015/D-017 (grant
-- nomeado direto para anon/authenticated na criação da função não é
-- resolvido por um revoke "from public"; precisa revoke nomeado). Nenhum
-- dado exposto até aqui (nunca commitado/anunciado), mas corrigido antes de
-- qualquer uso real.
revoke execute on function public.platform_suspend_establishment(uuid, public.suspension_reason) from anon, authenticated;
grant execute on function public.platform_suspend_establishment(uuid, public.suspension_reason) to authenticated;

revoke execute on function public.platform_reactivate_establishment(uuid) from anon, authenticated;
grant execute on function public.platform_reactivate_establishment(uuid) to authenticated;
