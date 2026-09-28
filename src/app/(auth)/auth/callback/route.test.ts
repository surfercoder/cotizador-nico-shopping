/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

const exchangeCodeForSession = jest.fn()
const verifyOtp = jest.fn()
jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession, verifyOtp } }),
}))
jest.mock("@/lib/site-url", () => ({ getSiteUrl: async () => "https://app.test" }))

import { GET } from "./route"

const pedido = (query: string) =>
  new NextRequest(`https://app.test/auth/callback${query}`)

const destino = async (query: string) =>
  (await GET(pedido(query))).headers.get("location")

beforeEach(() => {
  jest.clearAllMocks()
  exchangeCodeForSession.mockResolvedValue({ error: null })
  verifyOtp.mockResolvedValue({ error: null })
})

test("canjea el code de PKCE y entra a la home", async () => {
  await expect(destino("?code=abc")).resolves.toBe("https://app.test/")
  expect(exchangeCodeForSession).toHaveBeenCalledWith("abc")
})

test("acepta el token_hash de las plantillas de email", async () => {
  await expect(destino("?token_hash=hash&type=recovery")).resolves.toBe(
    "https://app.test/"
  )
  expect(verifyOtp).toHaveBeenCalledWith({ type: "recovery", token_hash: "hash" })
})

test("respeta un next de la allowlist y descarta el resto", async () => {
  await expect(destino("?code=abc&next=%2Fcatalogos")).resolves.toBe(
    "https://app.test/catalogos"
  )
  await expect(destino("?code=abc&next=%2F%2Fevil.com")).resolves.toBe(
    "https://app.test/"
  )
  await expect(destino("?code=abc&next=https%3A%2F%2Fevil.com")).resolves.toBe(
    "https://app.test/"
  )
  // Una ruta relativa que no es de la app tampoco pasa.
  await expect(destino("?code=abc&next=%2Fno-existe")).resolves.toBe(
    "https://app.test/"
  )
})

test("un link incompleto va a la pagina de error", async () => {
  await expect(destino("")).resolves.toBe(
    "https://app.test/auth/error?motivo=Link+invalido+o+incompleto."
  )
  // token_hash sin type tampoco alcanza.
  await expect(destino("?token_hash=hash")).resolves.toBe(
    "https://app.test/auth/error?motivo=Link+invalido+o+incompleto."
  )
  expect(exchangeCodeForSession).not.toHaveBeenCalled()
  expect(verifyOtp).not.toHaveBeenCalled()
})

test("el error de Supabase viaja en la URL para mostrarlo", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: { message: "Link vencido" } })

  await expect(destino("?code=viejo")).resolves.toBe(
    "https://app.test/auth/error?motivo=Link+vencido"
  )
})
