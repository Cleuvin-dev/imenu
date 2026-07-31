-- Fase 6 — correção: eventos de UPDATE via Realtime (mudança de status do
-- pedido, disponibilidade do produto) não chegavam ao cliente. Causa: com
-- REPLICA IDENTITY padrão (só chave primária), o Realtime não tem colunas
-- suficientes no registro antigo para reavaliar RLS/filtro em updates —
-- só INSERT (que sempre carrega a linha inteira) funcionava. FULL resolve.
alter table public.orders replica identity full;
alter table public.products replica identity full;
