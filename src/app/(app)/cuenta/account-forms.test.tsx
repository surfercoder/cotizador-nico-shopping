const updateProfile = jest.fn()
const changePassword = jest.fn()
jest.mock("./actions", () => ({
  updateProfile: (...args: unknown[]) => updateProfile(...args),
  changePassword: (...args: unknown[]) => changePassword(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ChangePasswordForm, ProfileForm } from "./account-forms"

beforeEach(() => {
  jest.clearAllMocks()
  updateProfile.mockResolvedValue({})
  changePassword.mockResolvedValue({})
})

test("el perfil arranca con el nombre guardado y manda el cambio", async () => {
  render(<ProfileForm fullName="Nico Shopping" />)

  const input = screen.getByLabelText("Nombre y apellido")
  expect(input).toHaveValue("Nico Shopping")

  await userEvent.clear(input)
  await userEvent.type(input, "Nicolas Shopping")
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

  expect(Object.fromEntries(updateProfile.mock.calls[0][1] as FormData)).toEqual({
    full_name: "Nicolas Shopping",
  })
})

test("el perfil muestra el error del nombre", async () => {
  updateProfile.mockResolvedValue({
    ok: false,
    message: "No pudimos guardar los cambios.",
    fieldErrors: { full_name: ["Ingresa tu nombre completo."] },
  })
  render(<ProfileForm fullName="Nico" />)

  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

  expect(await screen.findByText("No pudimos guardar los cambios.")).toBeInTheDocument()
  expect(screen.getByText("Ingresa tu nombre completo.")).toBeInTheDocument()
  expect(screen.getByLabelText("Nombre y apellido")).toHaveAttribute(
    "aria-invalid",
    "true"
  )
})

const completarCambio = async () => {
  await userEvent.type(screen.getByLabelText("Contrasena actual"), "Vieja2026")
  await userEvent.type(screen.getByLabelText("Nueva contrasena"), "Nueva2026")
  await userEvent.type(screen.getByLabelText("Repetir contrasena"), "Nueva2026")
}

test("el cambio de contrasena manda la actual y la nueva", async () => {
  render(<ChangePasswordForm />)

  await completarCambio()
  await userEvent.click(screen.getByRole("button", { name: "Cambiar contrasena" }))

  expect(Object.fromEntries(changePassword.mock.calls[0][1] as FormData)).toEqual({
    currentPassword: "Vieja2026",
    password: "Nueva2026",
    confirmPassword: "Nueva2026",
  })
})

test("el cambio de contrasena marca los tres campos si vuelven con error", async () => {
  changePassword.mockResolvedValue({
    ok: false,
    fieldErrors: {
      currentPassword: ["La contrasena actual no es correcta."],
      password: ["Minimo 8 caracteres."],
      confirmPassword: ["Las contrasenas no coinciden."],
    },
  })
  render(<ChangePasswordForm />)

  await completarCambio()
  await userEvent.click(screen.getByRole("button", { name: "Cambiar contrasena" }))

  expect(
    await screen.findByText("La contrasena actual no es correcta.")
  ).toBeInTheDocument()
  for (const campo of ["Contrasena actual", "Nueva contrasena", "Repetir contrasena"]) {
    expect(screen.getByLabelText(campo)).toHaveAttribute("aria-invalid", "true")
  }
})
