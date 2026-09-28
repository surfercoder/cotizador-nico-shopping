import { argumentos, crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireRole = jest.fn()
jest.mock("@/lib/dal", () => ({ requireRole: (...roles: string[]) => requireRole(...roles) }))

import { render, screen } from "@testing-library/react"

import type { Profile } from "@/schemas/profile"

import UsersPage, { metadata } from "./page"

const ADMIN_ID = "55555555-5555-4555-8555-555555555555"

const usuario = (override: Partial<Profile>): Profile => ({
  id: "99999999-9999-4999-8999-999999999999",
  email: "otro@shopping.com",
  full_name: "Otro Usuario",
  role: "operador",
  is_active: true,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireRole.mockResolvedValue({ id: ADMIN_ID })
})

test("solo el admin entra y ve la lista ordenada por antiguedad", async () => {
  mock.responde(() => ({
    data: [
      usuario({ id: ADMIN_ID, email: "nico@shopping.com", full_name: "Nico", role: "admin" }),
      usuario({}),
    ],
    error: null,
  }))

  render(await UsersPage())

  expect(metadata.title).toBe("Usuarios")
  expect(requireRole).toHaveBeenCalledWith("admin")
  expect(argumentos(mock.consultas[0], "order")).toEqual([
    "created_at",
    { ascending: true },
  ])
  expect(screen.getByText("nico@shopping.com")).toBeInTheDocument()
  expect(screen.getByText("otro@shopping.com")).toBeInTheDocument()

  // La fila del propio admin viene bloqueada.
  const roles = screen.getAllByLabelText("Rol")
  expect(roles[0]).toBeDisabled()
  expect(roles[1]).toBeEnabled()
})

test("sin usuarios la tabla queda vacia sin romper", async () => {
  mock.responde(() => ({ data: null, error: null }))

  render(await UsersPage())

  expect(screen.getByRole("table")).toBeInTheDocument()
  expect(screen.queryAllByLabelText("Rol")).toHaveLength(0)
})
