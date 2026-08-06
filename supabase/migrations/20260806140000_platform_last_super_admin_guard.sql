-- Fase 8 — Protege o último super_admin ativo de ser removido, rebaixado ou
-- desativado (docs/02 §4, docs/04 A-06 "impedir remoção do último
-- superadmin"). Mesmo padrão do guard de owner da Fase 1
-- (enforce_last_owner_guard em 20260729190000_identity_tenancy_tables.sql).

create or replace function public.enforce_last_super_admin_guard()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  remaining_super_admins integer;
  becomes_unsafe boolean;
begin
  if tg_op = 'DELETE' then
    becomes_unsafe := old.role = 'super_admin' and old.is_active;
  else
    becomes_unsafe := old.role = 'super_admin' and old.is_active
      and (new.role <> 'super_admin' or new.is_active = false);
  end if;

  if not becomes_unsafe then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select count(*) into remaining_super_admins
  from public.platform_admins
  where role = 'super_admin'
    and is_active
    and user_id <> old.user_id;

  if remaining_super_admins = 0 then
    raise exception 'platform_admins_last_super_admin_guard: não é possível remover, rebaixar ou desativar o único super_admin ativo'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger platform_admins_last_super_admin_guard
  before update or delete on public.platform_admins
  for each row execute function public.enforce_last_super_admin_guard();
