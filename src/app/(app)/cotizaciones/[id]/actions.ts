"use server"

import { revalidatePath } from "next/cache"

import {
  actionError,
  actionSuccess,
  parseFormData,
  type ActionState,
} from "@/lib/action-state"
import { requireAuthenticatedProfile } from "@/lib/dal"
import { createClient } from "@/lib/supabase/server"
import { guardarPrecioSchema } from "@/schemas/quote"

/**
 * Guarda el precio de una pieza. Cotizar lo hace cualquier usuario activo, no
 * solo los admin: la RLS de quote_items pide lo mismo.
 */
export async function guardarPrecio(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireAuthenticatedProfile()

  const parsed = parseFormData(guardarPrecioSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.from("quote_items").upsert({
    quote_id: parsed.data.quoteId,
    orion_repuesto_id: parsed.data.repuestoId,
    part_number: parsed.data.partNumber,
    price: parsed.data.price,
    currency: parsed.data.currency,
    catalog_id: parsed.data.catalogId,
    updated_by: profile.id,
    updated_at: new Date().toISOString(),
  })

  if (error) return actionError("No pudimos guardar el precio.")

  revalidatePath(`/cotizaciones/${parsed.data.quoteId}`)
  return actionSuccess("Guardado.")
}
