import * as z from "zod"

import type { Tables } from "@/types/database"

export type Quote = Tables<"quotes">

/**
 * Orion agrega a todos los pedidos una linea de flete con este idPieza. No es
 * una pieza y no se cotiza contra ningun catalogo, asi que no se lista.
 */
const FLETE = 999999

/**
 * La pieza que pidio el perito. Se tipa solo lo que se muestra; el objeto
 * entero que manda Orion sigue guardado en `detail`.
 *
 * `codRepuesto` es el codigo del fabricante cuando existe, pero un tercio de
 * las veces Orion manda uno interno suyo (`SCOD...` / `PSCOD...`) que no va a
 * existir en ningun catalogo. Ahi lo unico que queda es la descripcion.
 */
const repuestoSchema = z.object({
  id: z.number(),
  idPieza: z.number(),
  descripcion: z.string().nullish(),
  codRepuesto: z.string().nullish(),
})

export type Repuesto = z.infer<typeof repuestoSchema>

const detalleSchema = z.object({
  tipoMotor: z.string().nullish(),
  color: z.object({ descripcion: z.string().nullish() }).nullish(),
  observPerito: z.string().nullish(),
  listRepuestos: z.array(repuestoSchema).nullish(),
})

/**
 * `detail` es una columna Json: puede venir null (la cotizacion esta en
 * "Nuevas" y nadie la abrio todavia) o con otra forma si Orion cambia algo.
 * Lo que no encaja devuelve null en vez de romper la pagina.
 */
export function detalleDeCotizacion(detail: Quote["detail"]) {
  const parsed = detalleSchema.safeParse(detail)
  if (!parsed.success) return null

  const { listRepuestos, ...resto } = parsed.data
  return {
    ...resto,
    piezas: (listRepuestos ?? []).filter((pieza) => pieza.idPieza !== FLETE),
  }
}

export type QuoteItem = Tables<"quote_items">

export const MONEDAS = ["USD", "ARS"] as const

/**
 * El precio se escribe a mano y aca la coma es el decimal: "1234,56" y
 * "1.234,56" valen lo mismo. Sin coma, "1.234" es ambiguo (¿mil o uno con
 * algo?) y se rechaza antes que guardar un precio mil veces mas chico.
 * Vacio borra el precio (la pieza vuelve a quedar sin cotizar).
 */
const precio = z
  .string()
  .trim()
  .refine((valor) => !/^\d{1,3}(\.\d{3})+$/.test(valor), {
    error: "Usa coma para los decimales: 1234,56.",
  })
  .transform((valor) => {
    if (!valor) return null
    const normalizado = valor.includes(",")
      ? valor.replace(/\./g, "").replace(",", ".")
      : valor
    return Number(normalizado)
  })
  .pipe(
    z
      .number({ error: "Ingresa un numero." })
      .nonnegative({ error: "No puede ser negativo." })
      .max(9_999_999_999, { error: "Demasiado grande." })
      .nullable()
  )

export const guardarPrecioSchema = z.object({
  quoteId: z.uuid(),
  repuestoId: z.coerce.number().int().positive(),
  partNumber: z
    .string()
    .trim()
    .max(40, { error: "Maximo 40 caracteres." })
    .transform((valor) => valor || null),
  price: precio,
  currency: z.enum(MONEDAS),
  catalogId: z
    .string()
    .optional()
    .transform((valor) => valor || null)
    .pipe(z.uuid().nullable()),
})
