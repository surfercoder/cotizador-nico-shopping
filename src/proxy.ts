import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { env } from "@/lib/env"

/** Rutas accesibles sin sesion. */
const PUBLIC_PREFIXES = [
  "/login",
  "/registro",
  "/recuperar",
  "/actualizar-password",
  "/verificar-email",
  "/cuenta-inactiva",
  "/auth",
  // Los endpoints de /api no tienen sesion de usuario: se autentican solos
  // (el cron manda su propio secreto). Si los tocara el proxy, los mandaria
  // a /login con un 307 y el cron nunca correria.
  "/api",
]

/** Rutas que no tienen sentido con sesion abierta. */
const GUEST_ONLY_PREFIXES = ["/login", "/registro", "/recuperar"]

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`))

/**
 * Chequeo optimista + refresh del token de Supabase.
 * No consulta la base: solo lee la cookie. La autorizacion real vive en el DAL
 * (src/lib/dal.ts), lo mas cerca posible de los datos.
 */
export async function proxy(request: NextRequest) {
  // Lo que Supabase refresca en esta request se guarda aparte y se pega recien
  // sobre la respuesta que se devuelve: si se escribiera sobre un
  // `NextResponse.next()` armado de antes, los redirects saldrian sin el token
  // nuevo y el usuario volveria a caer en /login en la request siguiente.
  const cookiesDeSesion: {
    name: string
    value: string
    options?: Parameters<NextResponse["cookies"]["set"]>[2]
  }[] = []
  const cabecerasDeSesion: Record<string, string> = {}

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
            cookiesDeSesion.push({ name, value, options })
          }
          // Sin estos headers un CDN puede cachear el Set-Cookie y servirle
          // la sesion de un usuario a otro.
          Object.assign(cabecerasDeSesion, headers)
        },
      },
    }
  )

  const conSesion = (respuesta: NextResponse) => {
    for (const { name, value, options } of cookiesDeSesion) {
      respuesta.cookies.set(name, value, options)
    }
    for (const [key, value] of Object.entries(cabecerasDeSesion)) {
      respuesta.headers.set(key, value)
    }
    return respuesta
  }

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims?.sub)
  const path = request.nextUrl.pathname

  if (!isAuthenticated && !startsWithAny(path, PUBLIC_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    if (path !== "/") url.searchParams.set("next", path)
    return conSesion(NextResponse.redirect(url))
  }

  if (isAuthenticated && startsWithAny(path, GUEST_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    url.search = ""
    return conSesion(NextResponse.redirect(url))
  }

  return conSesion(NextResponse.next({ request }))
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
