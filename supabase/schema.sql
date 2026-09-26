begin;

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (char_length(company_name) between 2 and 160),
  inn text not null unique check (inn ~ '^\d{8,14}$'),
  status text not null default 'pending' check (status in ('active', 'pending', 'blocked')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 160),
  login_email text not null unique check (login_email = lower(login_email)),
  role text not null default 'buyer' check (role in ('admin', 'buyer')),
  created_at timestamptz not null default now()
);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);

create table if not exists public.lots (
  id uuid primary key default gen_random_uuid(),
  lot_number text not null unique check (char_length(lot_number) between 1 and 30),
  animal_type text not null check (animal_type in ('cattle', 'sheep', 'horse', 'yak', 'selection')),
  breed text not null check (char_length(breed) between 1 and 160),
  region text not null check (char_length(region) between 1 and 160),
  quantity integer not null check (quantity between 1 and 100000),
  weight_kg numeric(12,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 10000000)),
  feed_type text check (feed_type is null or char_length(feed_type) between 1 and 160),
  contract_type text not null check (contract_type in ('spot', 'forward')),
  contract_label text check (contract_label is null or char_length(contract_label) between 1 and 160),
  price numeric(12,2) not null default 1 check (price > 0 and price <= 100000000),
  price_unit text not null default 'сом' check (char_length(price_unit) between 1 and 40),
  price_note text check (price_note is null or char_length(price_note) between 1 and 80),
  primary_metric_label text check (primary_metric_label is null or char_length(primary_metric_label) between 1 and 120),
  primary_metric_value text check (primary_metric_value is null or char_length(primary_metric_value) between 1 and 200),
  secondary_metric_label text check (secondary_metric_label is null or char_length(secondary_metric_label) between 1 and 120),
  secondary_metric_value text check (secondary_metric_value is null or char_length(secondary_metric_value) between 1 and 200),
  tertiary_metric_label text check (tertiary_metric_label is null or char_length(tertiary_metric_label) between 1 and 120),
  tertiary_metric_value text check (tertiary_metric_value is null or char_length(tertiary_metric_value) between 1 and 200),
  status text not null default 'available' check (status in ('available', 'reserved', 'sold', 'closed')),
  status_note text check (status_note is null or char_length(status_note) between 1 and 200),
  action_note text check (action_note is null or char_length(action_note) between 1 and 200),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
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

update public.lots
set
  price = coalesce(price, 1),
  price_unit = coalesce(nullif(price_unit, ''), 'сом')
where price is null or price_unit is null or price_unit = '';

alter table public.lots alter column price set default 1;
alter table public.lots alter column price set not null;
alter table public.lots alter column price_unit set default 'сом';
alter table public.lots alter column price_unit set not null;

alter table public.lots drop constraint if exists lots_animal_type_check;
alter table public.lots drop constraint if exists lots_breed_check;
alter table public.lots drop constraint if exists lots_region_check;
alter table public.lots drop constraint if exists lots_weight_kg_check;
alter table public.lots drop constraint if exists lots_feed_type_check;
alter table public.lots drop constraint if exists lots_contract_type_check;
alter table public.lots drop constraint if exists lots_status_check;
alter table public.lots drop constraint if exists lots_contract_label_check;
alter table public.lots drop constraint if exists lots_price_check;
alter table public.lots drop constraint if exists lots_price_unit_check;
alter table public.lots drop constraint if exists lots_price_note_check;
alter table public.lots drop constraint if exists lots_primary_metric_label_check;
alter table public.lots drop constraint if exists lots_primary_metric_value_check;
alter table public.lots drop constraint if exists lots_secondary_metric_label_check;
alter table public.lots drop constraint if exists lots_secondary_metric_value_check;
alter table public.lots drop constraint if exists lots_tertiary_metric_label_check;
alter table public.lots drop constraint if exists lots_tertiary_metric_value_check;
alter table public.lots drop constraint if exists lots_status_note_check;
alter table public.lots drop constraint if exists lots_action_note_check;

alter table public.lots add constraint lots_animal_type_check check (animal_type in ('cattle', 'sheep', 'horse', 'yak', 'selection'));
alter table public.lots add constraint lots_breed_check check (char_length(breed) between 1 and 160);
alter table public.lots add constraint lots_region_check check (char_length(region) between 1 and 160);
alter table public.lots add constraint lots_weight_kg_check check (weight_kg is null or (weight_kg > 0 and weight_kg <= 10000000));
alter table public.lots add constraint lots_feed_type_check check (feed_type is null or char_length(feed_type) between 1 and 160);
alter table public.lots add constraint lots_contract_type_check check (contract_type in ('spot', 'forward'));
alter table public.lots add constraint lots_status_check check (status in ('available', 'reserved', 'sold', 'closed'));
alter table public.lots add constraint lots_contract_label_check check (contract_label is null or char_length(contract_label) between 1 and 160);
alter table public.lots add constraint lots_price_check check (price > 0 and price <= 100000000);
alter table public.lots add constraint lots_price_unit_check check (char_length(price_unit) between 1 and 40);
alter table public.lots add constraint lots_price_note_check check (price_note is null or char_length(price_note) between 1 and 80);
alter table public.lots add constraint lots_primary_metric_label_check check (primary_metric_label is null or char_length(primary_metric_label) between 1 and 120);
alter table public.lots add constraint lots_primary_metric_value_check check (primary_metric_value is null or char_length(primary_metric_value) between 1 and 200);
alter table public.lots add constraint lots_secondary_metric_label_check check (secondary_metric_label is null or char_length(secondary_metric_label) between 1 and 120);
alter table public.lots add constraint lots_secondary_metric_value_check check (secondary_metric_value is null or char_length(secondary_metric_value) between 1 and 200);
alter table public.lots add constraint lots_tertiary_metric_label_check check (tertiary_metric_label is null or char_length(tertiary_metric_label) between 1 and 120);
alter table public.lots add constraint lots_tertiary_metric_value_check check (tertiary_metric_value is null or char_length(tertiary_metric_value) between 1 and 200);
alter table public.lots add constraint lots_status_note_check check (status_note is null or char_length(status_note) between 1 and 200);
alter table public.lots add constraint lots_action_note_check check (action_note is null or char_length(action_note) between 1 and 200);

create index if not exists lots_status_created_at_idx on public.lots(status, created_at desc);

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
create index if not exists booking_requests_status_created_at_idx on public.booking_requests(status, created_at desc);
create unique index if not exists booking_requests_active_org_lot_idx
  on public.booking_requests(lot_id, buyer_organization_id)
  where status in ('new', 'confirmed');

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lots_set_updated_at on public.lots;
create trigger lots_set_updated_at before update on public.lots
for each row execute function private.set_updated_at();

drop trigger if exists booking_requests_set_updated_at on public.booking_requests;
create trigger booking_requests_set_updated_at before update on public.booking_requests
for each row execute function private.set_updated_at();

create or replace function public.create_managed_user_profile(
  p_user_id uuid,
  p_company_name text,
  p_inn text,
  p_full_name text,
  p_login_email text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_id uuid;
begin
  insert into public.organizations (company_name, inn, status)
  values (p_company_name, p_inn, 'active')
  returning id into organization_id;

  insert into public.profiles (id, organization_id, full_name, login_email, role)
  values (p_user_id, organization_id, p_full_name, p_login_email, p_role);

  return organization_id;
end;
$$;
revoke all on function public.create_managed_user_profile(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_managed_user_profile(uuid, text, text, text, text, text) to service_role;
grant select on table public.profiles to service_role;
grant select on table public.organizations to service_role;

create or replace function public.set_managed_organization_status(
  p_caller_id uuid,
  p_organization_id uuid,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('agromal_admin_status'));

  if not exists (
    select 1 from public.profiles p
    join public.organizations o on o.id = p.organization_id
    where p.id = p_caller_id and p.role = 'admin' and o.status = 'active'
  ) then raise exception 'FORBIDDEN';
  end if;

  if p_status not in ('active', 'blocked') then raise exception 'INVALID_STATUS';
  end if;

  if p_status = 'blocked' then
    if exists (select 1 from public.profiles where id = p_caller_id and organization_id = p_organization_id) then
      raise exception 'SELF_BLOCK_FORBIDDEN';
    end if;
    if not exists (
      select 1 from public.profiles p
      join public.organizations o on o.id = p.organization_id
      where p.role = 'admin' and o.status = 'active' and o.id <> p_organization_id
    ) then raise exception 'LAST_ADMIN_REQUIRED';
    end if;
  end if;

  update public.organizations set status = p_status where id = p_organization_id returning id into updated_id;
  if updated_id is null then raise exception 'ORGANIZATION_NOT_FOUND';
  end if;
  return updated_id;
end;
$$;
revoke all on function public.set_managed_organization_status(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_managed_organization_status(uuid, uuid, text) to service_role;

create or replace function public.current_access_context()
returns table (
  user_id uuid,
  full_name text,
  role text,
  organization_id uuid,
  company_name text,
  organization_status text
)
language sql
security definer
stable
set search_path = ''
as $$
  select p.id, p.full_name, p.role, o.id, o.company_name, o.status
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.id = auth.uid()
  limit 1;
$$;

revoke all on function public.current_access_context() from public, anon;
grant execute on function public.current_access_context() to authenticated;

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

  select public.lots.status into v_lot_status from public.lots where public.lots.id = lot_id;
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

revoke all on public.organizations, public.profiles, public.lots, public.booking_requests from anon;
grant select on public.organizations, public.profiles, public.lots to authenticated;
grant insert, update, delete on public.lots to authenticated;
grant select, update on public.booking_requests to authenticated;

grant usage, select on sequence public.booking_number_seq to authenticated;

commit;
