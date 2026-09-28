/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

const getClaims = jest.fn()
let cookies: {
  getAll: () => { name: string; value: string }[]
  setAll: (
    cookies: { name: string; value: string; options?: { path?: string } }[],
    headers: Record<string, string>
  ) => void
}

jest.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: typeof cookies }
  ) => {
    cookies = options.cookies
    return { auth: { getClaims } }
  },
}))

import { config, proxy } from "./proxy"

const pedido = (path: string) => new NextRequest(`https://app.test${path}`)

/**
 * Supabase refresca el token durante `getClaims`, asi que el doble escribe las
 * cookies ahi mismo: es el momento en el que pasa de verdad.
 */
const conSesion = (sub: string | undefined, refrescaToken = false) =>
  getClaims.mockImplementation(async () => {
    if (refrescaToken) {
      cookies.setAll([{ name: "sb-access-token", value: "nuevo", options: { path: "/" } }], {
        "cache-control": "no-store",
      })
    }
    return { data: sub ? { claims: { sub } } : null }
  })

beforeEach(() => jest.clearAllMocks())

test("sin sesion manda al login recordando a donde iba", async () => {
  conSesion(undefined)

  const response = await proxy(pedido("/catalogos"))

  expect(response.status).toBe(307)
  expect(response.headers.get("location")).toBe(
    "https://app.test/login?next=%2Fcatalogos"
  )
})

test("sin sesion la home no ensucia el login con next", async () => {
  conSesion(undefined)

  const response = await proxy(pedido("/"))

  expect(response.headers.get("location")).toBe("https://app.test/login")
})

test.each([
  "/login",
  "/registro",
  "/recuperar",
  "/actualizar-password",
  "/verificar-email",
  "/cuenta-inactiva",
  "/auth/callback",
  "/api/sync/orion",
])("%s se puede abrir sin sesion", async (path) => {
  conSesion(undefined)

  await expect(proxy(pedido(path)).then((r) => r.status)).resolves.toBe(200)
})

test("con sesion las paginas de invitado redirigen a la home", async () => {
  conSesion("user-1")

  const response = await proxy(pedido("/login"))

  expect(response.headers.get("location")).toBe("https://app.test/")
})

test("con sesion las paginas privadas pasan derecho", async () => {
  conSesion("user-1")

  await expect(proxy(pedido("/catalogos")).then((r) => r.status)).resolves.toBe(200)
  // Y una ruta que solo comparte prefijo no cuenta como publica.
  await expect(proxy(pedido("/loginzo")).then((r) => r.status)).resolves.toBe(200)
})

test("el refresh de token propaga cookies y headers de no-cache", async () => {
  conSesion("user-1", true)
  const request = pedido("/catalogos")

  const response = await proxy(request)

  expect(cookies.getAll()).toEqual(request.cookies.getAll())
  expect(response.cookies.get("sb-access-token")?.value).toBe("nuevo")
  expect(response.headers.get("cache-control")).toBe("no-store")
})

test("el token refrescado tambien viaja en los redirects", async () => {
  // Si se perdiera aca, el usuario volveria a caer en /login en cada request.
  conSesion(undefined, true)
  const sinSesion = await proxy(pedido("/catalogos"))

  expect(sinSesion.status).toBe(307)
  expect(sinSesion.cookies.get("sb-access-token")?.value).toBe("nuevo")
  expect(sinSesion.headers.get("cache-control")).toBe("no-store")

  conSesion("user-1", true)
  const conCuenta = await proxy(pedido("/login"))

  expect(conCuenta.status).toBe(307)
  expect(conCuenta.cookies.get("sb-access-token")?.value).toBe("nuevo")
})

test("el matcher deja afuera los estaticos", () => {
  // Next ancla el patron; suelto matchearia cualquier sufijo.
  const matcher = new RegExp(`^${config.matcher[0]}$`)

  expect(matcher.test("/catalogos")).toBe(true)
  expect(matcher.test("/_next/static/chunk.js")).toBe(false)
  expect(matcher.test("/logo.png")).toBe(false)
})
