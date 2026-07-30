-- Fase 2 — Índices de cobertura para chaves estrangeiras sinalizadas pelo
-- advisor de performance.

create index payments_recorded_by_idx on public.payments (recorded_by);
create index payments_reversed_by_idx on public.payments (reversed_by);
create index subscription_events_actor_user_id_idx on public.subscription_events (actor_user_id);
create index subscription_events_establishment_id_idx on public.subscription_events (establishment_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
