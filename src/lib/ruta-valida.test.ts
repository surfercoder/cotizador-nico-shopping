/**
 * @jest-environment node
 */
import { rutaValida } from "./ruta-valida"

test("acepta las rutas de la app", () => {
  expect(rutaValida("/")).toBe("/")
  expect(rutaValida("/catalogos")).toBe("/catalogos")
})

test("rechaza cualquier cosa que no este en la allowlist", () => {
  for (const intento of [
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "/catalogos?x=1",
    "/catalogos/../../admin",
    "/no-existe",
    "",
    undefined,
    null,
    42,
  ]) {
    expect(rutaValida(intento)).toBeUndefined()
  }
})
