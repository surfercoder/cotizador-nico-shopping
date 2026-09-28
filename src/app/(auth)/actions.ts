"use server"

import { redirect } from "next/navigation"

import {
  actionError,
  actionSuccess,
  parseFormData,
  type ActionState,
} from "@/lib/action-state"
import { rutaValida } from "@/lib/ruta-valida"
import { getSiteUrl } from "@/lib/site-url"
import { createClient } from "@/lib/supabase/server"
import {
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/schemas/auth"

/** Traduce los errores de Supabase Auth sin filtrar detalles internos. */
function authErrorMessage(message: string) {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email o contrasena incorrectos.",
    "Email not confirmed": "Confirma tu email antes de ingresar.",
    "Email rate limit exceeded":
      "Demasiados intentos. Espera unos minutos y proba de nuevo.",
  }
  return known[message] ?? "No pudimos completar la operacion. Intenta de nuevo."
}

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormData(loginSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) return actionError(authErrorMessage(error.message))

  // Se revalida contra la allowlist aca tambien: el destino de un redirect no
  // depende de que el schema haya corrido antes.
  redirect(rutaValida(parsed.data.next) ?? "/")
}

export async function signup(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormData(signupSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await getSiteUrl()}/auth/callback`,
    },
  })

  if (error) return actionError(authErrorMessage(error.message))

  // Con confirmacion de email activada no hay sesion todavia.
  if (!data.session) redirect("/verificar-email")

  // Toda cuenta nueva nace inactiva hasta que un admin la habilita
  // (salvo la primera del sistema, que queda admin).
  redirect("/cuenta-inactiva")
}

export async function requestPasswordReset(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormData(forgotPasswordSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/actualizar-password`,
  })

  // Respuesta identica exista o no la cuenta: no filtramos que emails existen.
  return actionSuccess(
    "Si el email esta registrado, te enviamos un link para recuperar la contrasena."
  )
}

export async function updatePassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = parseFormData(updatePasswordSchema, formData)
  if (!parsed.success) return parsed.state

  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) {
    return actionError(
      "El link de recuperacion vencio. Pedi uno nuevo desde 'Olvide mi contrasena'."
    )
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return actionError(authErrorMessage(error.message))

  redirect("/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
