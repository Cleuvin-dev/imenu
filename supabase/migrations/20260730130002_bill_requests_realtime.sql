-- Fase 7 — Realtime para o caixa (docs/08 §7: canal tenant:{id}:bill_requests).
-- REPLICA IDENTITY FULL desde já nas duas tabelas (lição de D-028: sem
-- isso, e sem aguardar a sessão do navegador antes de assinar — já
-- corrigido em use-realtime-invalidate.ts —, updates não chegam).
alter publication supabase_realtime add table public.bill_requests;
alter publication supabase_realtime add table public.table_service_sessions;

alter table public.bill_requests replica identity full;
alter table public.table_service_sessions replica identity full;
