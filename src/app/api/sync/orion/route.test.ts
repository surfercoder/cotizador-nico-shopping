/**
 * @jest-environment node
 */
const syncOrion = jest.fn()
jest.mock("@/lib/orion-sync", () => ({ syncOrion: () => syncOrion() }))

const after = jest.fn((callback: () => void) => callback())
jest.mock("next/server", () => ({ after: (callback: () => void) => after(callback) }))

import { GET } from "./route"

const pedido = (authorization?: string) =>
  new Request("https://app.test/api/sync/orion", {
    headers: authorization ? { authorization } : {},
  })

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, "error").mockImplementation(() => {})
  process.env.CRON_SECRET = "cron-test"
})

test("sin el secreto del cron no corre la sincronizacion", async () => {
  await expect(GET(pedido()).then((r) => r.status)).resolves.toBe(401)
  await expect(GET(pedido("Bearer otro")).then((r) => r.status)).resolves.toBe(401)

  delete process.env.CRON_SECRET
  await expect(GET(pedido("Bearer cron-test")).then((r) => r.status)).resolves.toBe(401)

  expect(syncOrion).not.toHaveBeenCalled()
})

test("con el secreto correcto devuelve el resultado de la corrida", async () => {
  const resultado = { plataforma: "Orion", traidas: 3, detalles: 2, empresa: "Trantor" }
  syncOrion.mockResolvedValue(resultado)

  const response = await GET(pedido("Bearer cron-test"))

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(resultado)
})

test("si la corrida falla devuelve 502 y loguea el motivo", async () => {
  syncOrion.mockRejectedValue(new Error("Orion respondio 500"))

  const response = await GET(pedido("Bearer cron-test"))

  expect(response.status).toBe(502)
  await expect(response.json()).resolves.toEqual({ error: "Orion respondio 500" })
  expect(console.error).toHaveBeenCalledWith("[sync orion]", "Orion respondio 500")
})

test("un error que no es Error igual contesta 502", async () => {
  syncOrion.mockRejectedValue("cayo la red")

  const response = await GET(pedido("Bearer cron-test"))

  expect(response.status).toBe(502)
  await expect(response.json()).resolves.toEqual({ error: "Error desconocido" })
})
