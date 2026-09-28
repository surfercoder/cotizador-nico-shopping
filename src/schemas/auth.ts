import * as z from "zod"

import { rutaValida } from "@/lib/ruta-valida"

// Se limpia antes de validar: un espacio pegado por el teclado del celular no
// tiene que devolver "email invalido".
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ingresa un email valido." }))

/**
 * Politica de contrasena. Tiene que coincidir con la configurada en
 * Supabase > Authentication > Policies, si no el error llega recien del server.
 */
const password = z
  .string()
  .min(8, { error: "Minimo 8 caracteres." })
  .max(72, { error: "Maximo 72 caracteres." })
  .regex(/[a-zA-Z]/, { error: "Tiene que incluir al menos una letra." })
  .regex(/[0-9]/, { error: "Tiene que incluir al menos un numero." })

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Ingresa tu contrasena." }),
  // Solo rutas de la app, para no habilitar open redirects.
  next: z
    .string()
    .optional()
    .transform((value) => rutaValida(value)),
})
export type LoginInput = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, { error: "Ingresa tu nombre completo." })
      .max(80, { error: "Maximo 80 caracteres." }),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  })
export type SignupInput = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({ email })
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  })
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>

/** Cambio de contrasena desde adentro: exige la actual como re-autenticacion. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Ingresa tu contrasena actual." }),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contrasenas no coinciden.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    error: "La nueva contrasena tiene que ser distinta de la actual.",
    path: ["password"],
  })
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
