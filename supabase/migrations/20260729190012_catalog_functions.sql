-- Fase 3 — Funções transacionais do catálogo (docs/07 §10, docs/03 regra 5).

-- publish_product: valida campos mínimos antes de publicar (RF-EST-014).
create or replace function public.publish_product(p_product_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_product record;
  v_category_is_active boolean;
begin
  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'publish_product: produto não encontrado' using errcode = 'P0002';
  end if;

  if not public.has_tenant_role(v_product.establishment_id, array['owner', 'manager', 'menu_editor']::public.member_role[]) then
    raise exception 'publish_product: sem permissão para publicar produtos deste estabelecimento'
      using errcode = '42501';
  end if;

  select is_active into v_category_is_active from public.categories where id = v_product.category_id;

  if v_category_is_active is not true then
    raise exception 'publish_product: a categoria do produto precisa estar ativa' using errcode = '22023';
  end if;

  if length(trim(v_product.name)) = 0 then
    raise exception 'publish_product: nome é obrigatório' using errcode = '22023';
  end if;

  if v_product.short_description is null or length(trim(v_product.short_description)) = 0 then
    raise exception 'publish_product: descrição curta é obrigatória' using errcode = '22023';
  end if;

  if v_product.base_price_cents < 0 then
    raise exception 'publish_product: preço não pode ser negativo' using errcode = '22023';
  end if;

  update public.products
  set status = 'published', published_at = now(), archived_at = null
  where id = p_product_id;

  return jsonb_build_object('id', p_product_id, 'status', 'published');
end;
$$;

revoke all on function public.publish_product(uuid) from public;
grant execute on function public.publish_product(uuid) to authenticated;

-- set_product_availability: alternância rápida de esgotado/disponível,
-- acessível também a kitchen/cashier (matriz "Disponibilidade rápida": O).
create or replace function public.set_product_availability(p_product_id uuid, p_is_available boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_establishment_id uuid;
begin
  select establishment_id into v_establishment_id from public.products where id = p_product_id;
  if not found then
    raise exception 'set_product_availability: produto não encontrado' using errcode = 'P0002';
  end if;

  if not public.has_tenant_role(
    v_establishment_id,
    array['owner', 'manager', 'menu_editor', 'kitchen', 'cashier']::public.member_role[]
  ) then
    raise exception 'set_product_availability: sem permissão para alterar disponibilidade neste estabelecimento'
      using errcode = '42501';
  end if;

  update public.products set is_available = p_is_available where id = p_product_id;

  return jsonb_build_object('id', p_product_id, 'is_available', p_is_available);
end;
$$;

revoke all on function public.set_product_availability(uuid, boolean) from public;
grant execute on function public.set_product_availability(uuid, boolean) to authenticated;
