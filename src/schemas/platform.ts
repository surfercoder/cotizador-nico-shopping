import * as z from "zod"

export const platformSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  login_url: z.url(),
  is_active: z.boolean(),
  last_sync_at: z.iso.datetime({ offset: true }).nullable(),
  last_sync_error: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
})
export type Platform = z.infer<typeof platformSchema>

/** Metadata de las credenciales. La password nunca sale de la base. */
export type PlatformCredentialStatus = {
  platform_id: string
  username: string
  updated_at: string
}

const name = z
  .string()
  .trim()
  .min(2, { error: "Ingresa el nombre de la plataforma." })
  .max(60, { error: "Maximo 60 caracteres." })

const loginUrl = z.url({ error: "Ingresa la URL de login completa." })

/**
 * El slug es la llave con la que el scraper encuentra la plataforma, asi que
 * se define al crearla y despues no se toca.
 */
export const createPlatformSchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, { error: "Ingresa un identificador." })
    .max(30, { error: "Maximo 30 caracteres." })
    .regex(/^[a-z0-9-]+$/, {
      error: "Solo minusculas, numeros y guiones.",
    }),
  login_url: loginUrl,
})
export type CreatePlatformInput = z.infer<typeof createPlatformSchema>

/** Un checkbox sin marcar no viaja en el FormData; marcado viaja como "on". */
export const updatePlatformFormSchema = z.object({
  platformId: z.uuid(),
  name,
  login_url: loginUrl,
  isActive: z
    .literal("on")
    .optional()
    .transform((value) => value === "on"),
})

export const deletePlatformSchema = z.object({ platformId: z.uuid() })

export const syncPlatformSchema = z.object({ platformId: z.uuid() })

export const platformCredentialsSchema = z.object({
  platformId: z.uuid(),
  username: z
    .string()
    .trim()
    .min(1, { error: "Ingresa el usuario de la plataforma." })
    .max(120, { error: "Maximo 120 caracteres." }),
  password: z
    .string()
    .min(1, { error: "Ingresa la contrasena." })
    .max(200, { error: "Maximo 200 caracteres." }),
})
