-- Check de seguridad de public.profiles. Corre entero en una transaccion y
-- limpia lo que crea. Si algo falla, tira un assert con el motivo.
--   psql "$DATABASE_URL" -f supabase/tests/profiles-security.sql
-- (o pegarlo en el SQL editor de Supabase)
do $$
declare
  admin_id uuid := gen_random_uuid();
  oper_id  uuid := gen_random_uuid();
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local', 'x', now(), '{}', '{"full_name":"Primer Admin"}', now(), now()),
    (oper_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'oper@test.local',  'x', now(), '{}', '{"full_name":"Operario Uno"}', now(), now());

  -- 1) el primer usuario queda admin activo, el segundo operador inactivo
  select * into r from public.profiles where id = admin_id;
  assert r.role = 'admin' and r.is_active, 'el primer usuario deberia ser admin activo';
  assert r.full_name = 'Primer Admin', 'full_name no se copio de raw_user_meta_data';

  select * into r from public.profiles where id = oper_id;
  assert r.role = 'operador' and not r.is_active, 'el segundo usuario deberia ser operador inactivo';

  -- 2) un operador no puede auto-promoverse ni auto-activarse
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  update public.profiles set role = 'admin', is_active = true, full_name = 'Hackeado' where id = oper_id;
  reset role;

  select * into r from public.profiles where id = oper_id;
  assert r.role = 'operador' and not r.is_active, 'ESCALADA DE PRIVILEGIOS: el operador se auto-promovio';
  assert r.full_name = 'Hackeado', 'el usuario deberia poder cambiar su propio nombre';

  -- 3) un operador no ve perfiles ajenos
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.profiles) = 1, 'RLS: el operador no deberia ver otros perfiles';
  reset role;

  -- 4) un admin ve todo y si puede cambiar roles
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.profiles) = 2, 'el admin deberia ver los dos perfiles';
  update public.profiles set role = 'supervisor', is_active = true where id = oper_id;
  reset role;

  select * into r from public.profiles where id = oper_id;
  assert r.role = 'supervisor' and r.is_active, 'el admin deberia poder cambiar rol y activacion';

  raise notice 'OK: trigger de alta, RLS y blindaje de privilegios funcionan';

  delete from auth.users where id in (admin_id, oper_id);
end $$;
