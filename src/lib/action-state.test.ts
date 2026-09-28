/**
 * @jest-environment node
 */
import * as z from "zod"

import {
  actionError,
  actionSuccess,
  initialActionState,
  parseFormData,
} from "./action-state"

const schema = z.object({ nombre: z.string().min(1) })

test("el estado inicial esta vacio y los helpers marcan ok", () => {
  expect(initialActionState).toEqual({})
  expect(actionSuccess()).toEqual({ ok: true, message: undefined })
  expect(actionSuccess("listo")).toEqual({ ok: true, message: "listo" })
  expect(actionError("mal")).toEqual({
    ok: false,
    message: "mal",
    fieldErrors: undefined,
  })
  expect(actionError("mal", { nombre: ["requerido"] })).toEqual({
    ok: false,
    message: "mal",
    fieldErrors: { nombre: ["requerido"] },
  })
})

test("parseFormData devuelve los datos tipados cuando el form es valido", () => {
  const formData = new FormData()
  formData.set("nombre", "Nico")

  expect(parseFormData(schema, formData)).toEqual({
    success: true,
    data: { nombre: "Nico" },
  })
})

test("parseFormData devuelve los errores por campo cuando el form es invalido", () => {
  const formData = new FormData()
  formData.set("nombre", "")

  const result = parseFormData(schema, formData)

  expect(result.success).toBe(false)
  // El narrowing lo da el discriminante, no un cast.
  if (result.success) throw new Error("se esperaba un fallo de validacion")
  expect(result.state.ok).toBe(false)
  expect(result.state.message).toBe("Revisa los datos ingresados.")
  expect(result.state.fieldErrors?.nombre).toHaveLength(1)
})
