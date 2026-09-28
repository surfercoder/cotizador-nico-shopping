import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { Profile, UserRole } from "@/schemas/profile"

/**
 * Data Access Layer: unico lugar donde se resuelve "quien es el usuario" y
 * "que puede hacer". Todo Server Component, Server Action y Route Handler que
 * toque datos protegidos entra por aca.
 *
 * `cache()` memoiza por render pass, asi que llamarlo en el layout y en la
 * pagina no duplica queries.
 */

/** Devuelve el usuario autenticado o null. No redirige. */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null
  return data.user
})

/** Devuelve el perfil del usuario autenticado o null. No redirige. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !data) return null
  return data
})

/**
 * Exige sesion valida y cuenta habilitada por un admin.
 * Es la puerta de entrada de todas las paginas privadas y de toda server
 * action que escriba datos del usuario.
 */
export const requireAuthenticatedProfile = cache(async (): Promise<Profile> => {
  const profile = await getProfile()
  if (!profile) redirect("/login")
  if (!profile.is_active) redirect("/cuenta-inactiva")
  return profile
})

/** Exige que el usuario tenga alguno de los roles indicados. */
export async function requireRole(...roles: UserRole[]): Promise<Profile> {
  const profile = await requireAuthenticatedProfile()
  if (!roles.includes(profile.role)) redirect("/sin-permisos")
  return profile
}
