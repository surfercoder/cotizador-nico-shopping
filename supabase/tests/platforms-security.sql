-- Check de seguridad de plataformas y credenciales. Corre entero en una
-- transaccion y limpia lo que crea. Si algo falla, tira un assert con el motivo.
--   psql "$DATABASE_URL" -f supabase/tests/platforms-security.sql
-- (o pegarlo en el SQL editor de Supabase)
do $$
declare
  admin_id uuid := gen_random_uuid();
  oper_id  uuid := gen_random_uuid();
  plat_id  uuid;
  secret_id uuid;
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-plat@test.local', 'x', now(), '{}', '{}', now(), now()),
    (oper_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'oper-plat@test.local',  'x', now(), '{}', '{}', now(), now());
  -- el trigger de profiles blinda role/is_active contra cualquiera que no sea
  -- admin logueado, asi que para armar el escenario se apaga un momento.
  alter table public.profiles disable trigger profiles_guard_privileges;
  update public.profiles set role = 'admin', is_active = true where id = admin_id;
  update public.profiles set role = 'operador', is_active = true where id = oper_id;
  alter table public.profiles enable trigger profiles_guard_privileges;

  insert into public.platforms (slug, name, login_url)
  values ('test-plat', 'Plataforma Test', 'https://test.local/login')
  returning id into plat_id;

  -- 1) un admin guarda credenciales y se pueden recuperar en claro
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.set_platform_credentials(plat_id, 'usuario-orion', 'clave-super-secreta');
  reset role;

  set local role service_role;
  select * into r from public.get_platform_credentials(plat_id);
  reset role;
  assert r.username = 'usuario-orion', 'el username no se guardo';
  assert r.password = 'clave-super-secreta', 'la password no se pudo descifrar';

  -- 2) la password no queda en claro en ninguna columna de la tabla
  assert not exists (
    select 1 from public.platform_credentials
    where platform_id = plat_id and username like '%clave-super-secreta%'
  ), 'FUGA: la password aparece en texto plano en platform_credentials';

  -- 3) un operador ve las plataformas pero no sus credenciales
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  assert (select count(*) from public.platforms where id = plat_id) = 1, 'el operador deberia ver las plataformas';
  assert (select count(*) from public.platform_credentials) = 0, 'FUGA: el operador ve platform_credentials';
  begin
    perform public.get_platform_credentials(plat_id);
    reset role;
    assert false, 'FUGA: un operador pudo ejecutar get_platform_credentials';
  exception when insufficient_privilege then null;
  end;
  reset role;

  -- 4) un operador no puede crear plataformas ni pisar credenciales
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', oper_id, 'role', 'authenticated')::text, true);
  begin
    insert into public.platforms (slug, name, login_url) values ('hack', 'Hack', 'https://hack.local');
    reset role;
    assert false, 'ESCALADA: un operador pudo crear una plataforma';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_platform_credentials(plat_id, 'hack', 'hack');
    reset role;
    assert false, 'ESCALADA: un operador pudo cambiar credenciales';
  exception when others then
    if sqlstate <> '42501' then raise; end if;
  end;
  reset role;

  -- 5) rotar la password reusa el mismo secreto y devuelve el valor nuevo
  select password_secret_id into secret_id from public.platform_credentials where platform_id = plat_id;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.set_platform_credentials(plat_id, 'usuario-orion', 'clave-nueva');
  reset role;
  set local role service_role;
  select * into r from public.get_platform_credentials(plat_id);
  reset role;
  assert r.password = 'clave-nueva', 'la rotacion de password no impacto';
  assert secret_id = (select password_secret_id from public.platform_credentials where platform_id = plat_id),
    'la rotacion deberia reusar el mismo secreto del vault';

  raise notice 'OK: RLS de plataformas, cifrado en vault y permisos de credenciales funcionan';

  delete from public.platforms where id = plat_id;
  delete from vault.secrets where id = secret_id;
  delete from auth.users where id in (admin_id, oper_id);
end $$;

-- Check del panel de admin: metadata visible sin exponer la password, y
-- limpieza del vault al borrar una plataforma.
do $$
declare
  admin_id uuid := gen_random_uuid();
  plat_id uuid;
  secret_id uuid;
  r record;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin-cascade@test.local', 'x', now(), '{}', '{}', now(), now());
  alter table public.profiles disable trigger profiles_guard_privileges;
  update public.profiles set role = 'admin', is_active = true where id = admin_id;
  alter table public.profiles enable trigger profiles_guard_privileges;

  insert into public.platforms (slug, name, login_url)
  values ('test-cascade', 'Cascade', 'https://x.local') returning id into plat_id;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  perform public.set_platform_credentials(plat_id, 'u', 'p');
  select * into r from public.platform_credentials_status() where platform_id = plat_id;
  reset role;
  assert r.username = 'u', 'el admin deberia ver el usuario cargado';

  select password_secret_id into secret_id from public.platform_credentials where platform_id = plat_id;
  assert exists (select 1 from vault.secrets where id = secret_id), 'no se creo el secreto en el vault';

  delete from public.platforms where id = plat_id;
  assert not exists (select 1 from vault.secrets where id = secret_id), 'quedo un secreto huerfano en el vault';

  raise notice 'OK: el admin ve metadata de credenciales y el vault se limpia solo';

  delete from auth.users where id = admin_id;
end $$;
