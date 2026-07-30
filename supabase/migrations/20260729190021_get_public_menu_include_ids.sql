-- Fase 4 — Correção: get_public_menu precisa devolver o establishment_id
-- (uso interno do servidor, para registrar a sessão anônima via
-- ensure_guest_session) além do table_id que já retornava. Não é dado
-- sensível — só é enviado quando a validação já teve sucesso (valid=true).

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
begin
  select id, trade_name, slug, logo_path, cover_path, timezone, is_active
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
    'categories', v_categories
  );
end;
$$;

revoke all on function public.get_public_menu(text, text) from public, anon, authenticated;
grant execute on function public.get_public_menu(text, text) to anon, authenticated;
