-- Fase 5 — índices de FK sinalizados pelo advisor de performance após a
-- criação das tabelas de pedido (mesmo cuidado das fases anteriores).

create index order_items_establishment_id_idx on public.order_items (establishment_id);
create index order_item_options_establishment_id_idx on public.order_item_options (establishment_id);
create index order_status_history_establishment_id_idx on public.order_status_history (establishment_id);
