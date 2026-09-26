-- Manual RLS verification. Replace UUID placeholders and run EACH transaction
-- separately in a non-production project. SET LOCAL ROLE is essential because
-- SQL Editor's owner role would otherwise bypass RLS.

-- 1. BUYER SELECT: must return allowed lots.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BUYER_AUTH_UUID","role":"authenticated"}', true);
select lot_number, status from public.lots;
rollback;

-- 2. BUYER UPDATE: must raise 42501 or affect zero rows.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BUYER_AUTH_UUID","role":"authenticated"}', true);
update public.lots set status = 'sold' where lot_number = 'DEMO-001';
rollback;

-- 3. BUYER DELETE: must raise 42501 or affect zero rows.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BUYER_AUTH_UUID","role":"authenticated"}', true);
delete from public.lots where lot_number = 'DEMO-001';
rollback;

-- 4. BUYER INSERT: must raise 42501.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BUYER_AUTH_UUID","role":"authenticated"}', true);
insert into public.lots (lot_number, animal_type, breed, region, quantity, weight_kg, feed_type, contract_type, status)
values ('RLS-REJECT', 'cattle', 'Test', 'Test', 1, 1, 'Test', 'spot', 'available');
rollback;

-- 5. BUYER ADMIN DATA: must return only their own profile and organization.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BUYER_AUTH_UUID","role":"authenticated"}', true);
select * from public.profiles;
select * from public.organizations;
rollback;

-- 6. ADMIN CRUD: all three mutations must affect one row.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ADMIN_AUTH_UUID","role":"authenticated"}', true);
insert into public.lots (lot_number, animal_type, breed, region, quantity, weight_kg, feed_type, contract_type, status)
values ('RLS-ADMIN-TEST', 'cattle', 'Test', 'Test', 1, 1, 'Test', 'spot', 'available');
update public.lots set status = 'closed' where lot_number = 'RLS-ADMIN-TEST';
delete from public.lots where lot_number = 'RLS-ADMIN-TEST';
rollback;

-- 7. BLOCKED: both reads must return zero rows.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"BLOCKED_AUTH_UUID","role":"authenticated"}', true);
select * from public.lots;
select * from public.profiles;
rollback;
