/**
 * @jest-environment node
 */
import { crearSupabaseMock, argumentos } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

const revalidatePath = jest.fn()
jest.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }))

import { initialActionState } from "@/lib/action-state"

import { guardarPrecio } from "./actions"

const QUOTE = "11111111-1111-4111-8111-111111111111"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

const PRECIO = {
  quoteId: QUOTE,
  repuestoId: "2230",
  partNumber: "521190K021",
  price: "175,59",
  currency: "USD",
  catalogId: "",
}

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireAuthenticatedProfile.mockResolvedValue({ id: "user-1" })
})

test("guarda el precio de la pieza a nombre del usuario de la sesion", async () => {
  await expect(guardarPrecio(initialActionState, form(PRECIO))).resolves.toEqual({
    ok: true,
    message: "Guardado.",
  })

  const upsert = mock.consulta("upsert")
  expect(upsert?.tabla).toBe("quote_items")
  expect(argumentos(upsert, "upsert")?.[0]).toMatchObject({
    quote_id: QUOTE,
    orion_repuesto_id: 2230,
    part_number: "521190K021",
    price: 175.59,
    currency: "USD",
    catalog_id: null,
    updated_by: "user-1",
  })
  expect(revalidatePath).toHaveBeenCalledWith(`/cotizaciones/${QUOTE}`)
})

test("un precio invalido no llega a la base", async () => {
  const state = await guardarPrecio(initialActionState, form({ ...PRECIO, price: "mucho" }))

  expect(state.ok).toBe(false)
  expect(state.fieldErrors?.price).toBeDefined()
  expect(mock.consulta("upsert")).toBeUndefined()
})

test("si la base falla avisa sin revalidar", async () => {
  mock.responde(() => ({ error: { message: "boom" } }))

  await expect(guardarPrecio(initialActionState, form(PRECIO))).resolves.toEqual({
    ok: false,
    message: "No pudimos guardar el precio.",
    fieldErrors: undefined,
  })
  expect(revalidatePath).not.toHaveBeenCalled()
})
