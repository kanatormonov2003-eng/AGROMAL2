begin;

create or replace function private.has_active_access()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid() and o.status = 'active'
  );
$$;

create or replace function private.is_admin()
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid() and p.role = 'admin' and o.status = 'active'
  );
$$;

revoke all on function private.has_active_access() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_active_access() to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.lots enable row level security;
alter table public.booking_requests enable row level security;

drop policy if exists organizations_select_own_or_admin on public.organizations;
create policy organizations_select_own_or_admin on public.organizations for select to authenticated
using (
  private.is_admin() or (
    private.has_active_access() and id = (select p.organization_id from public.profiles p where p.id = auth.uid())
  )
);

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles for select to authenticated
using (private.is_admin() or (private.has_active_access() and id = auth.uid()));

drop policy if exists lots_select_active_users on public.lots;
create policy lots_select_active_users on public.lots for select to authenticated
using (private.has_active_access());

drop policy if exists lots_insert_admin on public.lots;
create policy lots_insert_admin on public.lots for insert to authenticated
with check (private.is_admin());

drop policy if exists lots_update_admin on public.lots;
create policy lots_update_admin on public.lots for update to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists lots_delete_admin on public.lots;
create policy lots_delete_admin on public.lots for delete to authenticated
using (private.is_admin());

drop policy if exists booking_requests_select_admin on public.booking_requests;
create policy booking_requests_select_admin on public.booking_requests for select to authenticated
using (private.is_admin());

drop policy if exists booking_requests_update_admin on public.booking_requests;
create policy booking_requests_update_admin on public.booking_requests for update to authenticated
using (private.is_admin()) with check (private.is_admin());

commit;
