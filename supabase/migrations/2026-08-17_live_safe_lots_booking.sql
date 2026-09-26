begin;

-- Safe live migration for an existing AGROMAL Supabase project.
-- Goals:
-- 1) Extend the existing public.lots table to match the current frontend.
-- 2) Add booking storage + RPCs without deleting lots or replacing the lots table.
-- 3) Keep existing lots RLS intact and only add missing booking/ticker pieces.
-- 4) Preserve current live data, including existing demo lots.

create extension if not exists pgcrypto;
create schema if not exists private;

create or replace function private.has_active_access()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid() and o.status = 'active'
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid() and p.role = 'admin' and o.status = 'active'
  );
$$;

revoke all on function private.has_active_access() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_active_access() to authenticated;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 1. lots: add only the columns required by the current frontend / RPC layer
-- ---------------------------------------------------------------------------

alter table public.lots
  alter column weight_kg drop not null,
  alter column feed_type drop not null;

alter table public.lots add column if not exists contract_label text;
alter table public.lots add column if not exists price numeric(12,2);
alter table public.lots add column if not exists price_unit text;
alter table public.lots add column if not exists price_note text;
alter table public.lots add column if not exists primary_metric_label text;
alter table public.lots add column if not exists primary_metric_value text;
alter table public.lots add column if not exists secondary_metric_label text;
alter table public.lots add column if not exists secondary_metric_value text;
alter table public.lots add column if not exists tertiary_metric_label text;
alter table public.lots add column if not exists tertiary_metric_value text;
alter table public.lots add column if not exists status_note text;
alter table public.lots add column if not exists action_note text;

-- Do NOT invent a production price for existing non-priced lots.
-- New columns remain nullable until real values are supplied.

alter table public.lots alter column price drop default;
alter table public.lots alter column price_unit drop default;

-- Keep only a harmless index for the new read pattern.
create index if not exists lots_status_created_at_idx
  on public.lots(status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Optional live backfill for the existing 6 demo lots.
-- ---------------------------------------------------------------------------
-- IMPORTANT:
-- Only rows explicitly marked is_demo = true are eligible.
-- Existing non-demo/live lots are never modified by these updates.
-- No rows are deleted.

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '001'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '001'
  end,
  animal_type = 'cattle',
  breed = 'Швицкая порода (Бычки)',
  region = 'Чуйская область, Сокулукский район',
  quantity = 24,
  weight_kg = 10800,
  feed_type = 'Зерновой интенсивный откорм',
  contract_type = 'spot',
  contract_label = 'Разовая поставка — отгрузка 24 часа',
  price = 630,
  price_unit = 'сом / кг',
  price_note = 'в туше',
  primary_metric_label = 'Средний убойный вес туши',
  primary_metric_value = '≈ 240 кг одной головы',
  secondary_metric_label = null,
  secondary_metric_value = null,
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'available',
  status_note = null,
  action_note = null,
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-001', '001');

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '002'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '002'
  end,
  animal_type = 'sheep',
  breed = 'Гиссарская порода (Молодые бараны)',
  region = 'Чуйская область, Аламединский район',
  quantity = 120,
  weight_kg = 7200,
  feed_type = 'Предгорный нагул + докорм ячменем',
  contract_type = 'spot',
  contract_label = 'Разовая поставка — отгрузка 24 часа',
  price = 660,
  price_unit = 'сом / кг',
  price_note = 'в туше',
  primary_metric_label = 'Средний убойный вес туши',
  primary_metric_value = '≈ 28 кг одной головы',
  secondary_metric_label = null,
  secondary_metric_value = null,
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'available',
  status_note = null,
  action_note = null,
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-002', '002');

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '003'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '003'
  end,
  animal_type = 'horse',
  breed = 'Новокиргизская порода (Кони на согым)',
  region = 'Таласская область, Бакай-Атинский район',
  quantity = 8,
  weight_kg = null,
  feed_type = 'Напольный докорм (Клевер + кукуруза)',
  contract_type = 'spot',
  contract_label = 'Разовая поставка — готовы к транспортировке',
  price = 145000,
  price_unit = 'сомов',
  price_note = 'за голову',
  primary_metric_label = 'Упитанность',
  primary_metric_value = 'Высшая (Казы — 4 пальца)',
  secondary_metric_label = null,
  secondary_metric_value = null,
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'available',
  status_note = null,
  action_note = null,
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-003', '003');

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '004'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '004'
  end,
  animal_type = 'selection',
  breed = 'Абердин-Ангус (Племенные быки-производители)',
  region = 'Чуйская область, Ысык-Атинский район',
  quantity = 2,
  weight_kg = null,
  feed_type = null,
  contract_type = 'forward',
  contract_label = 'Селекционный выкуп / воспроизводство стада',
  price = 320000,
  price_unit = 'сомов',
  price_note = 'за голову',
  primary_metric_label = 'Документы',
  primary_metric_value = 'Племенные свидетельства, чипы ИСЖ, карты вакцинации',
  secondary_metric_label = 'Возраст / вес',
  secondary_metric_value = '18 месяцев / живой вес ≈ 580 кг',
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'available',
  status_note = null,
  action_note = null,
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-004', '004');

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '005'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '005'
  end,
  animal_type = 'yak',
  breed = 'Высокогорный Топоз (Самцы на убой)',
  region = 'Нарынская область, Ат-Башинский район (Высокогорные сырты)',
  quantity = 35,
  weight_kg = 12250,
  feed_type = 'Экологический высокогорный нагул',
  contract_type = 'forward',
  contract_label = 'Среднесрочный форвард — поставка октябрь 2026',
  price = 580,
  price_unit = 'сом / кг',
  price_note = 'в туше',
  primary_metric_label = null,
  primary_metric_value = null,
  secondary_metric_label = null,
  secondary_metric_value = null,
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'reserved',
  status_note = 'ЛОТ ЗАБРОНИРОВАН',
  action_note = 'ЛОТ ЗАБЛОКИРОВАН ДЛЯ ДРУГИХ УЧАСТНИКОВ',
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-005', '005');

update public.lots
set
  lot_number = case
    when exists (
      select 1
      from public.lots x
      where x.lot_number = '006'
        and x.id <> public.lots.id
    ) then public.lots.lot_number
    else '006'
  end,
  animal_type = 'sheep',
  breed = 'Местная тонкорунная порода (Овцы / Токтолу)',
  region = 'Нарынская область, Кочкорский район',
  quantity = 150,
  weight_kg = null,
  feed_type = null,
  contract_type = 'spot',
  contract_label = 'Разовая поставка',
  price = 13200,
  price_unit = 'сомов',
  price_note = 'за голову',
  primary_metric_label = null,
  primary_metric_value = null,
  secondary_metric_label = null,
  secondary_metric_value = null,
  tertiary_metric_label = null,
  tertiary_metric_value = null,
  status = 'closed',
  status_note = 'ТОРГИ ЗАКРЫТЫ — ЛОТ ВЫКУПЛЕН',
  action_note = 'СДЕЛКА ЗАКРЫТА — КОНТРАГЕНТ ID: ***-094',
  is_demo = true
where is_demo = true
  and lot_number in ('DEMO-006', '006');

-- ---------------------------------------------------------------------------
-- 3. booking_requests: new table for on-site booking flow
-- ---------------------------------------------------------------------------

create sequence if not exists public.booking_number_seq start with 1001 increment by 1;

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  booking_number text not null unique check (booking_number ~ '^AG-\d{4,}$'),
  lot_id uuid not null references public.lots(id) on delete restrict,
  lot_number text not null check (char_length(lot_number) between 1 and 30),
  lot_title text not null check (char_length(lot_title) between 1 and 220),
  price numeric(12,2) not null check (price > 0 and price <= 100000000),
  price_unit text not null check (char_length(price_unit) between 1 and 40),
  quantity integer not null check (quantity between 1 and 100000),
  customer_name text not null check (char_length(customer_name) between 2 and 160),
  customer_phone text not null check (char_length(customer_phone) between 6 and 32),
  comment text check (comment is null or char_length(comment) <= 1000),
  buyer_profile_id uuid not null references public.profiles(id) on delete restrict,
  buyer_organization_id uuid not null references public.organizations(id) on delete restrict,
  status text not null default 'new' check (status in ('new', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_requests_status_created_at_idx
  on public.booking_requests(status, created_at desc);

create unique index if not exists booking_requests_active_org_lot_idx
  on public.booking_requests(lot_id, buyer_organization_id)
  where status in ('new', 'confirmed');

-- IMPORTANT:
-- Use uniquely named helper objects so an existing live trigger/function
-- with a generic name is not overwritten.

create or replace function private.agromal_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.agromal_set_updated_at() from public, anon;
grant execute on function private.agromal_set_updated_at() to authenticated;

drop trigger if exists agromal_lots_set_updated_at on public.lots;
create trigger agromal_lots_set_updated_at
before update on public.lots
for each row execute function private.agromal_set_updated_at();

drop trigger if exists agromal_booking_requests_set_updated_at on public.booking_requests;
create trigger agromal_booking_requests_set_updated_at
before update on public.booking_requests
for each row execute function private.agromal_set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Public ticker RPC + booking RPCs
-- ---------------------------------------------------------------------------

create or replace function public.create_booking_request(
  p_lot_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_comment text default null
)
returns table (
  id uuid,
  booking_number text,
  lot_number text,
  lot_title text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_organization_id uuid;
  v_lot public.lots%rowtype;
  v_booking_number text;
  v_title text;
  v_created_at timestamptz;
begin
  select p.id, p.organization_id
    into v_profile_id, v_organization_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid() and o.status = 'active'
  limit 1;

  if v_profile_id is null then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'INVALID_CUSTOMER_NAME';
  end if;

  if char_length(trim(coalesce(p_customer_phone, ''))) < 6 then
    raise exception 'INVALID_CUSTOMER_PHONE';
  end if;

  select *
    into v_lot
  from public.lots
  where id = p_lot_id
  for update;

  if v_lot.id is null then
    raise exception 'LOT_NOT_FOUND';
  end if;

  if v_lot.status <> 'available' then
    raise exception 'LOT_UNAVAILABLE';
  end if;

  -- Do not create a booking with an invented price.
  if v_lot.price is null or v_lot.price_unit is null or btrim(v_lot.price_unit) = '' then
    raise exception 'LOT_PRICE_NOT_SET';
  end if;

  v_title := concat(
    case v_lot.animal_type
      when 'cattle' then 'КРС'
      when 'sheep' then 'МРС'
      when 'horse' then 'ЛОШАДИ'
      when 'yak' then 'ЯКИ'
      when 'selection' then 'СЕЛЕКЦИЯ'
      else upper(v_lot.animal_type)
    end,
    ' • ',
    v_lot.breed
  );

  v_booking_number := 'AG-' || lpad(nextval('public.booking_number_seq')::text, 4, '0');

  insert into public.booking_requests (
    booking_number,
    lot_id,
    lot_number,
    lot_title,
    price,
    price_unit,
    quantity,
    customer_name,
    customer_phone,
    comment,
    buyer_profile_id,
    buyer_organization_id,
    status
  )
  values (
    v_booking_number,
    v_lot.id,
    v_lot.lot_number,
    v_title,
    v_lot.price,
    v_lot.price_unit,
    v_lot.quantity,
    trim(p_customer_name),
    trim(p_customer_phone),
    nullif(trim(coalesce(p_comment, '')), ''),
    v_profile_id,
    v_organization_id,
    'new'
  )
  returning booking_requests.id, booking_requests.created_at
    into id, v_created_at;

  booking_number := v_booking_number;
  lot_number := v_lot.lot_number;
  lot_title := v_title;
  status := 'new';
  created_at := v_created_at;
  return next;

exception
  when unique_violation then
    raise exception 'BOOKING_ALREADY_EXISTS';
end;
$$;

revoke all on function public.create_booking_request(uuid, text, text, text) from public, anon;
grant execute on function public.create_booking_request(uuid, text, text, text) to authenticated;

create or replace function public.set_booking_request_status(
  p_booking_id uuid,
  p_status text,
  p_reserve_lot boolean default false
)
returns table (
  id uuid,
  status text,
  lot_id uuid,
  lot_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.booking_requests%rowtype;
  v_lot_status text;
begin
  if not exists (
    select 1 from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = auth.uid() and p.role = 'admin' and o.status = 'active'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_status not in ('new', 'confirmed', 'cancelled', 'completed') then
    raise exception 'INVALID_STATUS';
  end if;

  select *
    into v_booking
  from public.booking_requests
  where booking_requests.id = p_booking_id
  for update;

  if v_booking.id is null then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  update public.booking_requests
  set status = p_status
  where booking_requests.id = p_booking_id
  returning booking_requests.id, booking_requests.status, booking_requests.lot_id
  into id, status, lot_id;

  if p_reserve_lot then
    update public.lots
    set status = 'reserved'
    where public.lots.id = lot_id and public.lots.status = 'available';
  end if;

  select public.lots.status into v_lot_status
  from public.lots
  where public.lots.id = lot_id;

  lot_status := v_lot_status;
  return next;
end;
$$;

revoke all on function public.set_booking_request_status(uuid, text, boolean) from public, anon;
grant execute on function public.set_booking_request_status(uuid, text, boolean) to authenticated;

create or replace function public.public_trade_ticker(p_limit integer default 12)
returns table (
  lot_number text,
  animal_type text,
  breed text,
  quantity integer,
  region text,
  status text,
  status_note text
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    l.lot_number,
    l.animal_type,
    l.breed,
    l.quantity,
    l.region,
    l.status,
    l.status_note
  from public.lots l
  where l.status in ('sold', 'closed')
  order by l.updated_at desc, l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 30));
$$;

revoke all on function public.public_trade_ticker(integer) from public;
grant execute on function public.public_trade_ticker(integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Booking RLS / grants only. Existing lots RLS is intentionally preserved.
-- ---------------------------------------------------------------------------

alter table public.booking_requests enable row level security;

drop policy if exists booking_requests_select_admin on public.booking_requests;
create policy booking_requests_select_admin
on public.booking_requests
for select
to authenticated
using (private.is_admin());

drop policy if exists booking_requests_update_admin on public.booking_requests;
create policy booking_requests_update_admin
on public.booking_requests
for update
to authenticated
using (private.is_admin())
with check (private.is_admin());

revoke all on public.booking_requests from anon;
grant select, update on public.booking_requests to authenticated;
grant usage, select on sequence public.booking_number_seq to authenticated;

commit;
```
