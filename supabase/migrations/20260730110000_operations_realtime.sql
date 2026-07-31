-- Fase 6 — Operação em tempo real (docs/08 §7): habilita Realtime
-- (postgres_changes) para orders e products, para o KDS e a disponibilidade
-- rápida refletirem mudanças sem depender só de polling.
--
-- Não é necessário nenhum ajuste de RLS aqui: o Realtime reavalia as mesmas
-- policies de SELECT já ativas/forçadas nessas tabelas (qualquer membro
-- ativo do tenant lê pedidos e produtos; anon não lê nenhuma das duas
-- diretamente), então o isolamento multi-tenant já vale também via Realtime.
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.products;
