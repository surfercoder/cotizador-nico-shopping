/**
 * @jest-environment node
 */
const headers = jest.fn()
jest.mock("next/headers", () => ({ headers: () => headers() }))

const headerList = (valores: Record<string, string>) => ({
  get: (nombre: string) => valores[nombre] ?? null,
})

test("usa NEXT_PUBLIC_SITE_URL sin la barra final cuando esta configurada", async () => {
  jest.resetModules()
  jest.doMock("@/lib/env", () => ({
    env: { NEXT_PUBLIC_SITE_URL: "https://cotizador.app/" },
  }))
  const { getSiteUrl } = await import("./site-url")

  await expect(getSiteUrl()).resolves.toBe("https://cotizador.app")
})

test("cae a los headers del request cuando no hay variable", async () => {
  jest.resetModules()
  jest.doMock("@/lib/env", () => ({ env: {} }))
  const { getSiteUrl } = await import("./site-url")

  headers.mockResolvedValueOnce(
    headerList({ "x-forwarded-host": "app.vercel.app", "x-forwarded-proto": "http" })
  )
  await expect(getSiteUrl()).resolves.toBe("http://app.vercel.app")

  // Sin headers de proxy: host directo y https por defecto.
  headers.mockResolvedValueOnce(headerList({ host: "localhost:3000" }))
  await expect(getSiteUrl()).resolves.toBe("https://localhost:3000")
})
