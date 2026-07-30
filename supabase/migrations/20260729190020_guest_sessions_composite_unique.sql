-- Fase 4 — Correção de modelagem: o mesmo cookie de navegador pode visitar
-- mais de um estabelecimento/mesa ao longo do tempo. A unicidade de
-- `token_hash` sozinho impediria uma segunda sessão com o mesmo hash em
-- outra mesa. Corrige para unicidade composta (establishment_id, table_id,
-- token_hash), preservando o índice de busca por hash.

alter table public.guest_sessions drop constraint guest_sessions_token_hash_key;

alter table public.guest_sessions
  add constraint guest_sessions_establishment_table_token_key
  unique (establishment_id, table_id, token_hash);

create index guest_sessions_token_hash_idx on public.guest_sessions (token_hash);
