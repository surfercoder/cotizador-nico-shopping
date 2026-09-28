const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

import { render, screen } from "@testing-library/react"

import AccountPage, { metadata } from "./page"

test("muestra email, rol y los dos formularios de la cuenta", async () => {
  requireAuthenticatedProfile.mockResolvedValue({
    id: "user-1",
    email: "nico@shopping.com",
    full_name: "Nico Shopping",
    role: "supervisor",
    is_active: true,
    created_at: "2026-09-01T00:00:00+00:00",
    updated_at: "2026-09-01T00:00:00+00:00",
  })

  render(await AccountPage())

  expect(metadata.title).toBe("Mi cuenta")
  expect(screen.getByRole("heading", { name: "Mi cuenta" })).toBeInTheDocument()
  expect(screen.getByText(/nico@shopping.com/)).toHaveTextContent("Supervisor")
  expect(screen.getByLabelText("Nombre y apellido")).toHaveValue("Nico Shopping")
  expect(screen.getByLabelText("Contrasena actual")).toBeInTheDocument()
})
