/**
 * @jest-environment node
 */
import type { Profile } from "@/schemas/profile"

const getUser = jest.fn()
const maybeSingle = jest.fn()
const eq = jest.fn(() => ({ maybeSingle }))
const select = jest.fn(() => ({ eq }))
const from = jest.fn(() => ({ select }))

jest.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}))

// `redirect` corta la ejecucion tirando: si no tirara, el codigo de abajo
// seguiria corriendo con un perfil invalido.
jest.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`)
  },
}))

import { getProfile, getUser as getUsuario, requireAuthenticatedProfile, requireRole } from "./dal"

const perfil: Profile = {
  id: "user-1",
  email: "nico@shopping.com",
  full_name: "Nico",
  role: "admin",
  is_active: true,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
}

beforeEach(() => {
  jest.clearAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null })
  maybeSingle.mockResolvedValue({ data: perfil, error: null })
})

test("getUser devuelve el usuario autenticado", async () => {
  await expect(getUsuario()).resolves.toEqual({ id: "user-1" })
})

test("getUser devuelve null si Supabase falla o no hay sesion", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: new Error("x") })
  await expect(getUsuario()).resolves.toBeNull()

  getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  await expect(getUsuario()).resolves.toBeNull()
})

test("getProfile trae el perfil del usuario logueado", async () => {
  await expect(getProfile()).resolves.toEqual(perfil)
  expect(from).toHaveBeenCalledWith("profiles")
  expect(eq).toHaveBeenCalledWith("id", "user-1")
})

test("getProfile devuelve null sin usuario, con error o sin fila", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  await expect(getProfile()).resolves.toBeNull()

  maybeSingle.mockResolvedValueOnce({ data: null, error: new Error("x") })
  await expect(getProfile()).resolves.toBeNull()

  maybeSingle.mockResolvedValueOnce({ data: null, error: null })
  await expect(getProfile()).resolves.toBeNull()
})

test("requireAuthenticatedProfile deja pasar al usuario activo", async () => {
  await expect(requireAuthenticatedProfile()).resolves.toEqual(perfil)
})

test("requireAuthenticatedProfile manda al login sin perfil y a cuenta-inactiva si esta deshabilitado", async () => {
  getUser.mockResolvedValueOnce({ data: { user: null }, error: null })
  await expect(requireAuthenticatedProfile()).rejects.toThrow("REDIRECT:/login")

  maybeSingle.mockResolvedValueOnce({
    data: { ...perfil, is_active: false },
    error: null,
  })
  await expect(requireAuthenticatedProfile()).rejects.toThrow("REDIRECT:/cuenta-inactiva")
})

test("requireRole corta al usuario sin el rol pedido", async () => {
  await expect(requireRole("admin")).resolves.toEqual(perfil)

  maybeSingle.mockResolvedValueOnce({
    data: { ...perfil, role: "user" },
    error: null,
  })
  await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/sin-permisos")
})
