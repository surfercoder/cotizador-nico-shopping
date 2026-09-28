import * as z from "zod"

import type { Tables } from "@/types/database"

export type Catalog = Tables<"catalogs">

/** Metadata de las credenciales. La password nunca sale de la base. */
export type CatalogCredentialStatus = {
  catalog_id: string
  username: string
  updated_at: string
}

/**
 * Las marcas se guardan normalizadas (minusculas, sin acentos) para que
 * "Citroën", "citroen" y "CITROEN" sean la misma. Array vacio = multimarca.
 */
export const normalizeBrand = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()

export const formatBrand = (brand: string) =>
  brand.charAt(0).toUpperCase() + brand.slice(1)

/** Solo sugerencias del datalist: se puede escribir cualquier otra. */
export const BRAND_SUGGESTIONS = [
  "audi",
  "bmw",
  "chevrolet",
  "citroen",
  "fiat",
  "ford",
  "honda",
  "hyundai",
  "jeep",
  "kia",
  "mercedes",
  "nissan",
  "peugeot",
  "renault",
  "toyota",
  "volkswagen",
] as const

const name = z
  .string()
  .trim()
  .min(2, { error: "Ingresa el nombre del catalogo." })
  .max(60, { error: "Maximo 60 caracteres." })

const url = z.url({ error: "Ingresa la URL completa del catalogo." })

const notes = z
  .string()
  .trim()
  .max(300, { error: "Maximo 300 caracteres." })
  .optional()
  .transform((value) => value || null)

/** Viene como texto separado por comas desde un input suelto. */
const brands = z
  .string()
  .optional()
  .transform((value) => [
    ...new Set((value ?? "").split(",").map(normalizeBrand).filter(Boolean)),
  ])

/** Un checkbox sin marcar no viaja en el FormData; marcado viaja como "on". */
const checkbox = z
  .literal("on")
  .optional()
  .transform((value) => value === "on")

/** El slug es la llave con la que el scraper lo encuentra: no se cambia. */
export const createCatalogSchema = z.object({
  name,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, { error: "Ingresa un identificador." })
    .max(30, { error: "Maximo 30 caracteres." })
    .regex(/^[a-z0-9-]+$/, { error: "Solo minusculas, numeros y guiones." }),
  url,
  brands,
  requiresAuth: checkbox,
  notes,
})

export const updateCatalogFormSchema = z.object({
  catalogId: z.uuid(),
  name,
  url,
  brands,
  requiresAuth: checkbox,
  isActive: checkbox,
  notes,
})

export const deleteCatalogSchema = z.object({ catalogId: z.uuid() })

export const catalogCredentialsSchema = z.object({
  catalogId: z.uuid(),
  username: z
    .string()
    .trim()
    .min(1, { error: "Ingresa el usuario del catalogo." })
    .max(120, { error: "Maximo 120 caracteres." }),
  password: z
    .string()
    .min(1, { error: "Ingresa la contrasena." })
    .max(200, { error: "Maximo 200 caracteres." }),
})
