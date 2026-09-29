# Cotizador Nico Shopping

Sistema web interno para automatizar cotizaciones y licitaciones de repuestos
(Orion, Claims, Self) para Mendoza, San Juan, San Luis, Neuquen y La Pampa.

Stack: Next.js 16 (App Router, Turbopack, React Compiler), TypeScript, Supabase
(Postgres + Auth + RLS), shadcn/ui sobre Base UI + Tailwind v4, zod.

## Arranque

```bash
npm install
cp .env.example .env.local   # completar con las claves del proyecto Supabase
npm run dev
```

### Primer usuario

No hay seeds. El **primer** usuario que se registra queda `admin` + `is_active`
automaticamente (trigger `private.handle_new_user`). Todos los siguientes entran
como `operador` inactivos y los habilita un admin desde `/usuarios`.

Como Supabase tiene confirmacion de email activada y el SMTP propio esta
limitado, para el primer admin conviene crearlo desde el dashboard
(Authentication > Users > Add user, con "Auto Confirm User").

### Links de email en produccion

Los mails de Supabase (confirmar cuenta, recuperar contrasena) vuelven a la app
por `redirect_to`. Supabase lo ignora si no esta en su allowlist y en ese caso
manda al Site URL, asi que las dos puntas tienen que apuntar al dominio publico:

- Vercel: `NEXT_PUBLIC_SITE_URL=https://cotizador-nico-shopping.vercel.app` en
  Production. Sin ella la URL sale del header `host`, que en una deploy URL
  (`...-hash.vercel.app`) no coincide con la allowlist. Es `NEXT_PUBLIC_*`:
  cambiarla exige redeploy.
- Supabase > Authentication > URL Configuration: mismo valor en **Site URL** y
  `https://cotizador-nico-shopping.vercel.app/**` en **Redirect URLs**. Sumale
  `http://localhost:3000/**` si alguna vez das de alta en local: hoy no esta.

Se verifica sin gastar un mail real; si la Location no es el dominio publico,
la allowlist todavia esta mal:

```bash
source .env.local
curl -sD - -o /dev/null "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/verify?token=bogus&type=signup&redirect_to=https://cotizador-nico-shopping.vercel.app/auth/callback" | grep -i ^location
```

Pendiente: el link de confirmacion usa el flujo PKCE, asi que **solo se puede
abrir en el mismo navegador que hizo el alta** (registrarse en la PC y abrir el
mail en el celular falla). El callback ya soporta la alternativa portable
(`token_hash`), pero cambiar las plantillas exige SMTP propio, que hoy no hay.
Hasta entonces: avisar que abran el mail en la misma maquina, o crear la cuenta
desde el dashboard con "Auto Confirm User" y habilitarla en `/usuarios`.

## Estructura

```
src/
  app/
    (auth)/            paginas publicas de sesion + server actions de auth
      auth/callback/   destino de los links de email (PKCE y token_hash)
    (app)/             area privada; su layout exige sesion + cuenta activa
  components/          UI compartida (ui/ = shadcn, regenerable con el CLI)
  lib/
    dal.ts             Data Access Layer: unica fuente de "quien sos / que podes"
    action-state.ts    forma de respuesta de toda server action + parseo zod
    supabase/server.ts cliente por request (nunca a nivel de modulo)
    env.ts             validacion de variables de entorno con zod
    fecha.ts           unico lugar donde se formatea fecha/hora (es-AR, UTC-3)
    ruta-valida.ts     allowlist de destinos internos para los redirects
  schemas/             schemas zod + types inferidos por entidad
  types/database.ts    tipos generados desde Postgres
  proxy.ts             refresh de sesion + guard optimista de rutas
test/supabase.ts       doble del cliente de Supabase para los tests
supabase/tests/        checks de seguridad en SQL
```

Los tests viven al lado del archivo que prueban (`*.test.ts` / `*.test.tsx`).
Los de servidor declaran `@jest-environment node`; el resto corre en jsdom con
Testing Library.

## Sincronizacion con Orion

El sync corre en `/api/sync/orion`, se autentica con `Authorization: Bearer
$CRON_SECRET` y es idempotente: se puede disparar todas las veces que haga
falta sin duplicar nada.

Lo dispara **GitHub Actions** (`.github/workflows/sync-orion.yml`) cada 20
minutos entre las 10 y las 23 de Argentina, y no un cron de Vercel: en el plan
Hobby los cron jobs corren una vez por dia como maximo y, peor, un `crons` con
mas frecuencia **hace fallar el deploy entero**. Si el proyecto pasa a Pro, se
puede volver a `vercel.json` y borrar el workflow.

Para que el workflow funcione, en GitHub > Settings > Secrets and variables >
Actions:

- Secret `CRON_SECRET`: el mismo valor que la variable de entorno en Vercel.
- Variable `SYNC_URL`: `https://<dominio>/api/sync/orion`.

A mano: pestaña Actions > Sync Orion > Run workflow, o el boton "Sincronizar
ahora" de `/plataformas`, que hace exactamente lo mismo desde la UI.

## Reglas del proyecto

- Toda mutacion pasa por una **server action** que valida con zod y re-verifica
  permisos con el DAL. El chequeo del `proxy.ts` es solo optimista.
- Ninguna action confia en ids que vengan del formulario para identificar al
  usuario: eso sale siempre de la sesion.
- Las server actions devuelven `ActionState`, nunca filas crudas de la base.
- Despues de cada migracion, regenerar `src/types/database.ts`.

## Checks

Todos tienen que pasar antes de subir a `main` (`/create-pr` los corre):

```bash
npm run lint            # 0 errores y 0 warnings
npm run type-check      # sin any, sin @ts-ignore
npm run test:coverage   # 100% de branches, functions, lines y statements
npm run build
npx react-doctor --score  # 100/100
# seguridad de profiles (RLS, trigger de alta, escalada de privilegios):
# correr supabase/tests/profiles-security.sql contra la base
```
