import { argumentos, crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireRole = jest.fn()
jest.mock("@/lib/dal", () => ({ requireRole: (...roles: string[]) => requireRole(...roles) }))

import { render, screen } from "@testing-library/react"

import type { Platform } from "@/schemas/platform"

import PlatformsPage, { metadata } from "./page"

const ID = "88888888-8888-4888-8888-888888888888"

const plataforma = (override: Partial<Platform> = {}): Platform => ({
  id: ID,
  slug: "orion",
  name: "Sistema Orion",
  login_url: "https://orion.com/login",
  is_active: true,
  last_sync_at: null,
  last_sync_error: null,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireRole.mockResolvedValue({ id: "admin-1" })
  mock.rpc.mockResolvedValue({ data: [], error: null })
})

test("solo el admin entra y ve las plataformas ordenadas por nombre", async () => {
  mock.responde(() => ({ data: [plataforma()], error: null }))

  render(await PlatformsPage())

  expect(metadata.title).toBe("Plataformas")
  expect(requireRole).toHaveBeenCalledWith("admin")
  expect(argumentos(mock.consultas[0], "order")).toEqual(["name"])
  expect(screen.getByText("Sistema Orion")).toBeInTheDocument()
  expect(
    screen.getByText("Sin credenciales", { selector: "[data-slot=badge]" })
  ).toBeInTheDocument()
})

test("cruza el estado de credenciales con cada plataforma", async () => {
  mock.responde(() => ({ data: [plataforma()], error: null }))
  mock.rpc.mockResolvedValue({
    data: [
      { platform_id: ID, username: "27123456789", updated_at: "2026-09-20T12:00:00+00:00" },
      // Una credencial de otra plataforma no tiene que aparecer.
      { platform_id: "otro", username: "x", updated_at: "2026-09-20T12:00:00+00:00" },
    ],
    error: null,
  })

  render(await PlatformsPage())

  expect(mock.rpc).toHaveBeenCalledWith("platform_credentials_status")
  expect(
    screen.getByText("Con credenciales", { selector: "[data-slot=badge]" })
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Usuario de la plataforma")).toHaveValue("27123456789")
})

test("sin plataformas lo dice, y si la consulta falla no rompe", async () => {
  mock.responde(() => ({ data: [], error: null }))
  const { unmount } = render(await PlatformsPage())
  expect(screen.getByText("Todavia no hay plataformas cargadas.")).toBeInTheDocument()
  unmount()

  mock.responde(() => ({ data: null, error: { message: "rls" } }))
  mock.rpc.mockResolvedValue({ data: null, error: { message: "rls" } })
  render(await PlatformsPage())
  expect(screen.queryByText("Todavia no hay plataformas cargadas.")).toBeNull()
  expect(screen.getByRole("button", { name: "Agregar" })).toBeInTheDocument()
})
