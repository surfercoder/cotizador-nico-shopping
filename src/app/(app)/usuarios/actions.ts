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
import { updateUserAccessFormSchema } from "@/schemas/profile"

/** Habilita/deshabilita usuarios y les asigna rol. Solo admin. */
export async function updateUserAccess(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireRole("admin")

  const parsed = parseFormData(updateUserAccessFormSchema, formData)
  if (!parsed.success) return parsed.state

  if (parsed.data.userId === admin.id) {
    return actionError("No podes cambiar tu propio rol ni desactivarte.")
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role, is_active: parsed.data.isActive })
    .eq("id", parsed.data.userId)

  if (error) return actionError("No pudimos actualizar el usuario.")

  revalidatePath("/usuarios")
  return actionSuccess("Usuario actualizado.")
}
