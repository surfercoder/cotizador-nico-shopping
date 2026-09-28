import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { rutaValida } from "@/lib/ruta-valida"
import { getSiteUrl } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"

/**
 * Destino de los links que Supabase manda por email (confirmacion de cuenta,
 * recupero de contrasena, invitaciones). Soporta las dos formas: `code` (PKCE,
 * default) y `token_hash` (si se editan las plantillas de email).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  // La URL del mail no elige a donde se entra: solo puede pedir una de las
  // rutas conocidas y cualquier otra cosa cae en la home.
  const destino = rutaValida(searchParams.get("next")) ?? "/"

  const [siteUrl, supabase] = await Promise.all([getSiteUrl(), createClient()])

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: { message: "Link invalido o incompleto." } }

  if (error) {
    const url = new URL("/auth/error", siteUrl)
    url.searchParams.set("motivo", error.message)
    return NextResponse.redirect(url)
  }

  return NextResponse.redirect(new URL(destino, siteUrl))
}
