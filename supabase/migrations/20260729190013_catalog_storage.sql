-- Fase 3 — Buckets de Storage e políticas de storage.objects (docs/07 §13).
-- Caminho: {establishment_id}/... — o primeiro segmento do caminho é sempre
-- o establishment_id, usado pelas policies para checar associação de tenant.
-- Buckets públicos: o objeto só é acessível por quem já sabe o caminho
-- (alta entropia, nunca listado publicamente) — leitura via listagem/API
-- ainda passa por RLS abaixo, restrita a membros autenticados.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brand-media', 'brand-media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('menu-media', 'menu-media', true, 52428800, array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- brand-media: logo/capa do estabelecimento — só owner/manager (matriz
-- "Configurações do local").

create policy brand_media_select_member_or_platform_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'brand-media'
    and (
      public.is_active_member(((storage.foldername(name))[1])::uuid)
      or public.is_platform_admin(null)
    )
  );

create policy brand_media_insert_owner_manager
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'brand-media'
    and public.has_tenant_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager']::public.member_role[])
  );

create policy brand_media_update_owner_manager
  on storage.objects for update to authenticated
  using (
    bucket_id = 'brand-media'
    and public.has_tenant_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager']::public.member_role[])
  )
  with check (
    bucket_id = 'brand-media'
    and public.has_tenant_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager']::public.member_role[])
  );

create policy brand_media_delete_owner_manager
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'brand-media'
    and public.has_tenant_role(((storage.foldername(name))[1])::uuid, array['owner', 'manager']::public.member_role[])
  );

-- menu-media: mídia de produto — owner/manager/menu_editor (matriz "Mídias").

create policy menu_media_select_member_or_platform_admin
  on storage.objects for select to authenticated
  using (
    bucket_id = 'menu-media'
    and (
      public.is_active_member(((storage.foldername(name))[1])::uuid)
      or public.is_platform_admin(null)
    )
  );

create policy menu_media_insert_owner_manager_menu_editor
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'menu-media'
    and public.has_tenant_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'manager', 'menu_editor']::public.member_role[]
    )
  );

create policy menu_media_update_owner_manager_menu_editor
  on storage.objects for update to authenticated
  using (
    bucket_id = 'menu-media'
    and public.has_tenant_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'manager', 'menu_editor']::public.member_role[]
    )
  )
  with check (
    bucket_id = 'menu-media'
    and public.has_tenant_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'manager', 'menu_editor']::public.member_role[]
    )
  );

create policy menu_media_delete_owner_manager_menu_editor
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'menu-media'
    and public.has_tenant_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner', 'manager', 'menu_editor']::public.member_role[]
    )
  );
