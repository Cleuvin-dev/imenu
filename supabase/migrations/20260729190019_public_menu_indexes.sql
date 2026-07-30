-- Fase 4 — Índice de cobertura para FK sinalizada pelo advisor de performance.
create index guest_sessions_table_id_idx on public.guest_sessions (table_id);
