-- Fase 5 — índices de cobertura (docs/07 §12) e de FKs sinalizadas pelo
-- advisor de performance (mesmo cuidado das fases anteriores).

create index orders_establishment_status_created_idx
  on public.orders (establishment_id, status, created_at desc);

create index orders_table_service_session_created_idx
  on public.orders (table_service_session_id, created_at);

create index orders_table_id_idx on public.orders (table_id);
create index orders_guest_session_id_idx on public.orders (guest_session_id);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create index order_item_options_order_item_id_idx on public.order_item_options (order_item_id);
create index order_item_options_option_id_idx on public.order_item_options (option_id);

create index order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at);
create index order_status_history_actor_user_id_idx on public.order_status_history (actor_user_id);

create index table_service_sessions_closed_by_idx on public.table_service_sessions (closed_by);
