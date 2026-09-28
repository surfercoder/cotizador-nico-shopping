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
import { changePasswordSchema } from "@/schemas/auth"
import { updateProfileSchema } from "@/schemas/profile"

export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireAuthenticatedProfile()

  const parsed = parseFormData(updateProfileSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name })
    // El id sale de la sesion, nunca del formulario.
    .eq("id", profile.id)

  if (error) return actionError("No pudimos guardar los cambios.")

  revalidatePath("/cuenta")
  return actionSuccess("Datos actualizados.")
}

export async function changePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const profile = await requireAuthenticatedProfile()

  const parsed = parseFormData(changePasswordSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()

  // Re-autenticacion: sin la contrasena actual no se cambia nada, asi una
  // sesion robada no alcanza para tomar la cuenta.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  })
  if (reauthError) {
    return {
      ok: false,
      fieldErrors: { currentPassword: ["La contrasena actual no es correcta."] },
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return actionError("No pudimos cambiar la contrasena.")

  return actionSuccess("Contrasena actualizada.")
}
