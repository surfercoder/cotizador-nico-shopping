/**
 * @jest-environment node
 */
import type { CookieOptions } from "@supabase/ssr"

const createServerClient = jest.fn()
jest.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClient(...args),
}))

const cookieStore = {
  getAll: jest.fn(() => [{ name: "sb", value: "token" }]),
  set: jest.fn(),
}
jest.mock("next/headers", () => ({ cookies: async () => cookieStore }))

type Cookies = {
  getAll: () => { name: string; value: string }[]
  setAll: (
    cookies: { name: string; value: string; options?: CookieOptions }[]
  ) => void
}

const cookiesDelCliente = async (): Promise<Cookies> => {
  const { createClient } = await import("./server")
  await createClient()
  return createServerClient.mock.calls.at(-1)?.[2].cookies
}

beforeEach(() => jest.clearAllMocks())

test("crea el cliente con la url y la key publicas", async () => {
  await cookiesDelCliente()

  expect(createServerClient).toHaveBeenCalledWith(
    "https://proyecto.supabase.co",
    "sb_publishable_test",
    expect.anything()
  )
})

test("lee y escribe las cookies del request", async () => {
  const cookies = await cookiesDelCliente()

  expect(cookies.getAll()).toEqual([{ name: "sb", value: "token" }])

  cookies.setAll([{ name: "sb", value: "nuevo", options: { path: "/" } }])
  expect(cookieStore.set).toHaveBeenCalledWith("sb", "nuevo", { path: "/" })
})

test("ignora el error de escribir cookies desde un Server Component", async () => {
  const cookies = await cookiesDelCliente()
  cookieStore.set.mockImplementationOnce(() => {
    throw new Error("Cookies can only be modified in a Server Action")
  })

  expect(() =>
    cookies.setAll([{ name: "sb", value: "nuevo" }])
  ).not.toThrow()
})
