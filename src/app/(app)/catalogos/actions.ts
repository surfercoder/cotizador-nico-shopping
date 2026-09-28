"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  parseFormData,
  type ActionState,
} from "@/lib/action-state"
import { requireRole } from "@/lib/dal"
import { createClient } from "@/lib/supabase/server"
import {
  catalogCredentialsSchema,
  createCatalogSchema,
  deleteCatalogSchema,
  updateCatalogFormSchema,
} from "@/schemas/catalog"

/**
 * Alta, baja y modificacion de catalogos de repuestos. Mismo trato que las
 * plataformas: `requireRole` da el mensaje lindo y la RLS es la que bloquea.
 */

export async function createCatalog(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(createCatalogSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.from("catalogs").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
    url: parsed.data.url,
    brands: parsed.data.brands,
    requires_auth: parsed.data.requiresAuth,
    notes: parsed.data.notes,
  })

  if (error?.code === "23505") {
    return actionError("Ya existe un catalogo con ese identificador.")
  }
  if (error) return actionError("No pudimos crear el catalogo.")

  revalidatePath("/catalogos")
  return actionSuccess("Catalogo creado.")
}

export async function updateCatalog(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(updateCatalogFormSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from("catalogs")
    .update({
      name: parsed.data.name,
      url: parsed.data.url,
      brands: parsed.data.brands,
      requires_auth: parsed.data.requiresAuth,
      is_active: parsed.data.isActive,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.catalogId)

  if (error) return actionError("No pudimos actualizar el catalogo.")

  revalidatePath("/catalogos")
  return actionSuccess("Catalogo actualizado.")
}

export async function deleteCatalog(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(deleteCatalogSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from("catalogs")
    .delete()
    .eq("id", parsed.data.catalogId)

  if (error) return actionError("No pudimos eliminar el catalogo.")

  revalidatePath("/catalogos")
  return actionSuccess("Catalogo eliminado.")
}

/**
 * La password viaja hasta la funcion del vault y no se guarda en ningun lado
 * mas: ni en una columna, ni en el log de la action.
 */
export async function saveCatalogCredentials(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireRole("admin")

  const parsed = parseFormData(catalogCredentialsSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.rpc("set_catalog_credentials", {
    p_catalog_id: parsed.data.catalogId,
    p_username: parsed.data.username,
    p_password: parsed.data.password,
  })

  if (error) return actionError("No pudimos guardar las credenciales.")

  revalidatePath("/catalogos")
  return actionSuccess("Credenciales guardadas.")
}
