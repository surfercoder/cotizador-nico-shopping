import "server-only"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { env } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Se crea uno nuevo por request: nunca guardarlo en una variable de modulo,
 * porque en runtimes que reusan instancias (Fluid compute) filtraria la sesion
 * de un usuario a otro.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Los Server Components no pueden escribir cookies. El refresh de
            // token lo resuelve el proxy en cada request, asi que se ignora.
          }
        },
      },
    }
  )
}
