"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  parseFormData,
  type ActionState,
} from "@/lib/action-state"
import { requireRole } from "@/lib/dal"
import { syncOrion } from "@/lib/orion-sync"
import { createClient } from "@/lib/supabase/server"
import {
  createPlatformSchema,
  deletePlatformSchema,
  platformCredentialsSchema,
  syncPlatformSchema,
  updatePlatformFormSchema,
} from "@/schemas/platform"

/**
 * Alta, baja y modificacion de plataformas de cotizacion. Todo exige admin: el
 * `requireRole` da el mensaje lindo y la RLS es la que de verdad bloquea.
 */

export async function createPlatform(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(createPlatformSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.from("platforms").insert(parsed.data)

  if (error?.code === "23505") {
    return actionError("Ya existe una plataforma con ese identificador.")
  }
  if (error) return actionError("No pudimos crear la plataforma.")

  revalidatePath("/plataformas")
  return actionSuccess("Plataforma creada.")
}

export async function updatePlatform(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(updatePlatformFormSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from("platforms")
    .update({
      name: parsed.data.name,
      login_url: parsed.data.login_url,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.platformId)

  if (error) return actionError("No pudimos actualizar la plataforma.")

  revalidatePath("/plataformas")
  return actionSuccess("Plataforma actualizada.")
}

export async function deletePlatform(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(deletePlatformSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from("platforms")
    .delete()
    .eq("id", parsed.data.platformId)

  if (error) return actionError("No pudimos eliminar la plataforma.")

  revalidatePath("/plataformas")
  return actionSuccess("Plataforma eliminada.")
}

/**
 * La password viaja hasta la funcion del vault y no se guarda en ningun lado
 * mas: ni en una columna, ni en el log de la action.
 */
export async function savePlatformCredentials(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(platformCredentialsSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.rpc("set_platform_credentials", {
    p_platform_id: parsed.data.platformId,
    p_username: parsed.data.username,
    p_password: parsed.data.password,
  })

  if (error) return actionError("No pudimos guardar las credenciales.")

  revalidatePath("/plataformas")
  return actionSuccess("Credenciales guardadas.")
}

/**
 * Sync a pedido desde la UI. El cron hace exactamente lo mismo cada 20 minutos;
 * esto es para no tener que esperarlo despues de cargar credenciales.
 */
export async function syncPlatformNow(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(syncPlatformSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { data: platform } = await supabase
    .from("platforms")
    .select("slug")
    .eq("id", parsed.data.platformId)
    .maybeSingle()

  if (platform?.slug !== "orion") {
    return actionError("Todavia solo sabemos sincronizar Sistema Orion.")
  }

  try {
    const { traidas, detalles, empresa } = await syncOrion()
    revalidatePath("/plataformas")
    revalidatePath("/")
    return actionSuccess(
      `Listo: ${traidas} cotizaciones sincronizadas${detalles ? ` (${detalles} con detalle nuevo)` : ""}${empresa ? ` para ${empresa}` : ""}.`
    )
  } catch (error) {
    revalidatePath("/plataformas")
    return actionError(
      error instanceof Error ? error.message : "Fallo la sincronizacion."
    )
  }
}
