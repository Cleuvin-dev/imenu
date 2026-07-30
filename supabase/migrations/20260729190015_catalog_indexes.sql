-- Fase 3 — Índices de cobertura para FKs sinalizadas pelo advisor de performance.

create index options_establishment_id_idx on public.options (establishment_id);
create index product_media_establishment_id_idx on public.product_media (establishment_id);
create index product_option_groups_establishment_id_idx on public.product_option_groups (establishment_id);
create index product_option_groups_option_group_id_idx on public.product_option_groups (option_group_id);
create index products_category_id_idx on public.products (category_id);
