const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

import { render, screen } from "@testing-library/react"

import AppLayout from "./layout"

test("el layout privado exige perfil y arma el header", async () => {
  requireAuthenticatedProfile.mockResolvedValue({
    id: "user-1",
    email: "nico@shopping.com",
    full_name: "Nico Shopping",
    role: "admin",
    is_active: true,
    created_at: "2026-09-01T00:00:00+00:00",
    updated_at: "2026-09-01T00:00:00+00:00",
  })

  render(await AppLayout({ params: Promise.resolve({}), children: <p>Contenido</p> }))

  expect(requireAuthenticatedProfile).toHaveBeenCalled()
  expect(screen.getByRole("button", { name: "Usuarios" })).toBeInTheDocument()
  expect(screen.getByText("Contenido")).toBeInTheDocument()
})
