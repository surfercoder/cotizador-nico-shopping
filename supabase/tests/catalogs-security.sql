-- Check de seguridad de catalogos y sus credenciales. Corre entero en una
-- transaccion y limpia lo que crea. Si algo falla, tira un assert con el motivo.
--   psql "$DATABASE_URL" -f supabase/tests/catalogs-security.sql
-- (o pegarlo en el SQL editor de Supabase)
do $$
declare
  admin_id uuid := gen_random_uuid();
  oper_id  uuid := gen_random_uuid();
  cat_id   uuid;
  secret_id uuid;
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-cat@test.local', 'x', now(), '{}', '{}', now(), now()),
    (oper_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'oper-cat@test.local',  'x', now(), '{}', '{}', now(), now());
  alter table public.profiles disable trigger profiles_guard_privileges;
  update public.profiles set role = 'admin', is_active = true where id = admin_id;
  update public.profiles set role = 'operador', is_active = true where id = oper_id;
  alter table public.profiles enable trigger profiles_guard_privileges;

  insert into public.catalogs (slug, name, url, brands, requires_auth)
  values ('test-cat', 'Catalogo Test', 'https://test.local', '{peugeot,citroen}', true)
  returning id into cat_id;

  -- 1) un admin guarda credenciales y se pueden recuperar en claro
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.set_catalog_credentials(cat_id, 'usuario-cat', 'clave-super-secreta');
  select * into r from public.catalog_credentials_status() where catalog_id = cat_id;
  reset role;
  assert r.username = 'usuario-cat', 'el admin deberia ver el usuario cargado';

  set local role service_role;
  select * into r from public.get_catalog_credentials(cat_id);
  reset role;
  assert r.password = 'clave-super-secreta', 'la password no se pudo descifrar';

  -- 2) la password no queda en claro en ninguna columna
  assert not exists (
    select 1 from public.catalog_credentials
    where catalog_id = cat_id and username like '%clave-super-secreta%'
  ), 'FUGA: la password aparece en texto plano en catalog_credentials';

  -- 3) un operador ve los catalogos pero no sus credenciales
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.catalogs where id = cat_id) = 1, 'el operador deberia ver los catalogos';
  assert (select count(*) from public.catalog_credentials) = 0, 'FUGA: el operador ve catalog_credentials';
  begin
    perform public.get_catalog_credentials(cat_id);
    reset role;
    assert false, 'FUGA: un operador pudo ejecutar get_catalog_credentials';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 4) un operador no puede crear catalogos ni pisar credenciales
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  begin
    insert into public.catalogs (slug, name, url) values ('hack-cat', 'Hack', 'https://hack.local');
    reset role;
    assert false, 'ESCALADA: un operador pudo crear un catalogo';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_catalog_credentials(cat_id, 'hack', 'hack');
    reset role;
    assert false, 'ESCALADA: un operador pudo cambiar credenciales';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  reset role;

  -- 5) borrar el catalogo se lleva el secreto del vault
  select password_secret_id into secret_id from public.catalog_credentials where catalog_id = cat_id;
  assert exists (select 1 from vault.secrets where id = secret_id), 'no se creo el secreto en el vault';
  delete from public.catalogs where id = cat_id;
  assert not exists (select 1 from vault.secrets where id = secret_id), 'quedo un secreto huerfano en el vault';

  raise notice 'OK: RLS de catalogos, cifrado en vault y permisos de credenciales funcionan';

  delete from auth.users where id in (admin_id, oper_id);
end $$;
