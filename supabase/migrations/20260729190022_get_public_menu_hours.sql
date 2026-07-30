-- Fase 4 — get_public_menu também informa horário de funcionamento e
-- pausa manual de pedidos (docs/03 §8: ver menu não implica poder pedir).
-- Sem exceção/horário configurado para o dia, considera aberto (MVP: a
-- tela de configuração de horários é da Fase 8; não há dado ainda).

create or replace function public.get_public_menu(p_establishment_slug text, p_table_token text)
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  v_establishment record;
  v_table record;
  v_access jsonb;
  v_categories jsonb;
  v_local_now timestamp;
  v_local_date date;
  v_local_weekday int;
  v_local_time time;
  v_hours record;
  v_is_open boolean;
begin
  select id, trade_name, slug, logo_path, cover_path, timezone, is_active, accepting_orders
    into v_establishment
    from public.establishments
    where slug = p_establishment_slug;

  if not found or not v_establishment.is_active then
    return jsonb_build_object('valid', false);
  end if;

  select id, name, is_active
    into v_table
    from public.dining_tables
    where establishment_id = v_establishment.id and public_token = p_table_token;

  if not found or not v_table.is_active then
    return jsonb_build_object('valid', false);
  end if;

  v_access := public.evaluate_establishment_access(v_establishment.id);

  v_local_now := now() at time zone v_establishment.timezone;
  v_local_date := v_local_now::date;
  v_local_weekday := extract(dow from v_local_now)::int;
  v_local_time := v_local_now::time;

  select is_closed, opens_at, closes_at
    into v_hours
    from public.business_hour_exceptions
    where establishment_id = v_establishment.id and date = v_local_date;

  if not found then
    select is_closed, opens_at, closes_at
      into v_hours
      from public.business_hours
      where establishment_id = v_establishment.id and weekday = v_local_weekday;
  end if;

  if not found then
    v_is_open := true;
  elsif v_hours.is_closed then
    v_is_open := false;
  else
    v_is_open := v_local_time >= v_hours.opens_at and v_local_time < v_hours.closes_at;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'products', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', p.id,
                'slug', p.slug,
                'name', p.name,
                'shortDescription', p.short_description,
                'description', p.description,
                'ingredients', to_jsonb(p.ingredients),
                'allergens', to_jsonb(p.allergens),
                'nutrition', p.nutrition,
                'basePriceCents', p.base_price_cents,
                'isAvailable', p.is_available,
                'media', (
                  select coalesce(
                    jsonb_agg(
                      jsonb_build_object(
                        'kind', m.kind,
                        'storagePath', m.storage_path,
                        'posterPath', m.poster_path,
                        'altText', m.alt_text,
                        'isPrimary', m.is_primary
                      )
                      order by m.is_primary desc, m.sort_order
                    ),
                    '[]'::jsonb
                  )
                  from public.product_media m
                  where m.product_id = p.id
                ),
                'optionGroups', (
                  select coalesce(
                    jsonb_agg(
                      jsonb_build_object(
                        'id', og.id,
                        'name', og.name,
                        'minSelect', og.min_select,
                        'maxSelect', og.max_select,
                        'options', (
                          select coalesce(
                            jsonb_agg(
                              jsonb_build_object(
                                'id', o.id,
                                'name', o.name,
                                'priceDeltaCents', o.price_delta_cents
                              )
                              order by o.sort_order
                            ),
                            '[]'::jsonb
                          )
                          from public.options o
                          where o.option_group_id = og.id and o.is_available = true
                        )
                      )
                      order by pog.sort_order
                    ),
                    '[]'::jsonb
                  )
                  from public.product_option_groups pog
                  join public.option_groups og on og.id = pog.option_group_id and og.is_active = true
                  where pog.product_id = p.id
                )
              )
              order by p.sort_order
            ),
            '[]'::jsonb
          )
          from public.products p
          where p.category_id = c.id and p.status = 'published'
        )
      )
      order by c.sort_order
    ),
    '[]'::jsonb
  )
  into v_categories
  from public.categories c
  where c.establishment_id = v_establishment.id and c.is_active = true;

  return jsonb_build_object(
    'valid', true,
    'establishment', jsonb_build_object(
      'id', v_establishment.id,
      'tradeName', v_establishment.trade_name,
      'slug', v_establishment.slug,
      'logoPath', v_establishment.logo_path,
      'coverPath', v_establishment.cover_path,
      'timezone', v_establishment.timezone
    ),
    'table', jsonb_build_object('id', v_table.id, 'name', v_table.name),
    'access', v_access,
    'operation', jsonb_build_object(
      'isOpenNow', v_is_open,
      'acceptingOrders', v_establishment.accepting_orders
    ),
    'categories', v_categories
  );
end;
$$;

revoke all on function public.get_public_menu(text, text) from public, anon, authenticated;
grant execute on function public.get_public_menu(text, text) to anon, authenticated;
