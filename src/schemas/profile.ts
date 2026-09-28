import * as z from "zod"

import { Constants } from "@/types/database"

export const userRoleSchema = z.enum(Constants.public.Enums.user_role)
export type UserRole = z.infer<typeof userRoleSchema>

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  supervisor: "Supervisor",
  operador: "Operador",
}

export const profileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  full_name: z.string(),
  role: userRoleSchema,
  is_active: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
})
export type Profile = z.infer<typeof profileSchema>

/** Lo que un usuario puede editar de si mismo. */
export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, { error: "Ingresa tu nombre completo." })
    .max(80, { error: "Maximo 80 caracteres." }),
})
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/** Lo que un admin puede cambiarle a otro usuario. */
export const updateUserAccessSchema = z.object({
  userId: z.uuid(),
  role: userRoleSchema,
  isActive: z.boolean(),
})
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>

/**
 * Misma intencion que `updateUserAccessSchema`, pero con la codificacion de un
 * <form>: un checkbox sin marcar no viaja, y marcado viaja como "on".
 */
export const updateUserAccessFormSchema = z.object({
  userId: z.uuid(),
  role: userRoleSchema,
  isActive: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
})
