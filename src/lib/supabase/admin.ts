import "server-only"

import { createClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"
import type { Database } from "@/types/database"

/**
 * Cliente con la secret key: saltea RLS. Lo usa solo el proceso de sync, que
 * corre sin usuario (cron) y necesita leer las credenciales de las plataformas.
 * Nunca importar esto desde un componente ni exponerlo en una action de usuario.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY")

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
