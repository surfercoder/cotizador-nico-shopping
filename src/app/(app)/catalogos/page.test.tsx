import { argumentos, crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireRole = jest.fn()
jest.mock("@/lib/dal", () => ({ requireRole: (...roles: string[]) => requireRole(...roles) }))

import { render, screen } from "@testing-library/react"

import type { Catalog } from "@/schemas/catalog"

import CatalogsPage, { metadata } from "./page"

const ID = "77777777-7777-4777-8777-777777777777"

const catalogo = (override: Partial<Catalog> = {}): Catalog => ({
  id: ID,
  slug: "servicebox",
  name: "Service Box",
  url: "https://servicebox.com",
  brands: ["peugeot"],
  requires_auth: true,
  is_active: true,
  notes: null,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

const marcasSugeridas = () =>
  Array.from(document.querySelectorAll("#brand-suggestions option")).map((option) =>
    option.getAttribute("value")
  )

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireRole.mockResolvedValue({ id: "admin-1" })
  mock.rpc.mockResolvedValue({ data: [], error: null })
})

test("solo el admin entra y ve los catalogos ordenados por nombre", async () => {
  mock.responde(() => ({ data: [catalogo()], error: null }))

  render(await CatalogsPage())

  expect(metadata.title).toBe("Catalogos")
  expect(requireRole).toHaveBeenCalledWith("admin")
  expect(argumentos(mock.consultas[0], "order")).toEqual(["name"])
  expect(screen.getByText("Service Box")).toBeInTheDocument()
  expect(
    screen.getByText("Sin credenciales", { selector: "[data-slot=badge]" })
  ).toBeInTheDocument()
})

test("las sugerencias suman las marcas ya cargadas, sin repetir y ordenadas", async () => {
  mock.responde(() => ({
    data: [catalogo({ brands: ["peugeot", "jac"] })],
    error: null,
  }))

  render(await CatalogsPage())

  const marcas = marcasSugeridas()
  expect(marcas).toContain("jac")
  expect(marcas.filter((marca) => marca === "peugeot")).toHaveLength(1)
  expect(marcas).toEqual([...marcas].sort())
})

test("cruza el estado de credenciales con cada catalogo", async () => {
  mock.responde(() => ({ data: [catalogo()], error: null }))
  mock.rpc.mockResolvedValue({
    data: [
      { catalog_id: ID, username: "nico", updated_at: "2026-09-20T12:00:00+00:00" },
      { catalog_id: "otro", username: "x", updated_at: "2026-09-20T12:00:00+00:00" },
    ],
    error: null,
  })

  render(await CatalogsPage())

  expect(mock.rpc).toHaveBeenCalledWith("catalog_credentials_status")
  expect(screen.getByLabelText("Usuario del catalogo")).toHaveValue("nico")
})

test("sin catalogos lo dice, y si la consulta falla no rompe", async () => {
  mock.responde(() => ({ data: [], error: null }))
  const { unmount } = render(await CatalogsPage())
  expect(screen.getByText("Todavia no hay catalogos cargados.")).toBeInTheDocument()
  unmount()

  mock.responde(() => ({ data: null, error: { message: "rls" } }))
  mock.rpc.mockResolvedValue({ data: null, error: { message: "rls" } })
  render(await CatalogsPage())
  expect(screen.queryByText("Todavia no hay catalogos cargados.")).toBeNull()
  // Las sugerencias base siguen estando aunque no haya catalogos.
  expect(marcasSugeridas()).toContain("peugeot")
})
