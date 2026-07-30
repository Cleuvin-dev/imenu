-- Fase 3 — Correção de privilégio: desta vez o Supabase concedeu EXECUTE
-- diretamente ao papel anon (grant nomeado, não via PUBLIC) em
-- publish_product/set_product_availability — "revoke ... from public" não
-- alcança um grant nomeado. Revogar sempre de public E dos papéis nomeados
-- explicitamente cobre os dois mecanismos observados (ver D-015 e D-017).

revoke all on function public.publish_product(uuid) from public, anon;
grant execute on function public.publish_product(uuid) to authenticated;

revoke all on function public.set_product_availability(uuid, boolean) from public, anon;
grant execute on function public.set_product_availability(uuid, boolean) to authenticated;
