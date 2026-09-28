const getProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ getProfile: () => getProfile() }))

import { render, screen } from "@testing-library/react"

import InactiveAccountPage, { metadata } from "./page"

test("nombra la cuenta que quedo esperando habilitacion", async () => {
  getProfile.mockResolvedValue({ email: "nico@shopping.com" })

  render(await InactiveAccountPage())

  expect(metadata.title).toBe("Cuenta pendiente")
  expect(
    screen.getByText(/La cuenta nico@shopping.com existe pero todavia no fue habilitada/)
  ).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Cerrar sesion" })).toBeInTheDocument()
})

test("sin perfil a mano igual explica que falta la habilitacion", async () => {
  getProfile.mockResolvedValue(null)

  render(await InactiveAccountPage())

  expect(screen.getByText(/Tu cuenta todavia no fue habilitada/)).toBeInTheDocument()
})
