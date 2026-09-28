const updatePassword = jest.fn()
jest.mock("@/app/(auth)/actions", () => ({
  updatePassword: (...args: unknown[]) => updatePassword(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { UpdatePasswordForm } from "./update-password-form"

const completar = async () => {
  await userEvent.type(screen.getByLabelText("Nueva contrasena"), "Nueva2026")
  await userEvent.type(screen.getByLabelText("Repetir contrasena"), "Nueva2026")
}

beforeEach(() => {
  jest.clearAllMocks()
  updatePassword.mockResolvedValue({})
})

test("manda la contrasena nueva y su confirmacion", async () => {
  render(<UpdatePasswordForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Guardar contrasena" }))

  expect(Object.fromEntries(updatePassword.mock.calls[0][1] as FormData)).toEqual({
    password: "Nueva2026",
    confirmPassword: "Nueva2026",
  })
})

test("muestra el aviso de link vencido y los errores por campo", async () => {
  updatePassword.mockResolvedValue({
    ok: false,
    message: "El link de recuperacion vencio.",
    fieldErrors: {
      password: ["Minimo 8 caracteres."],
      confirmPassword: ["Las contrasenas no coinciden."],
    },
  })
  render(<UpdatePasswordForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Guardar contrasena" }))

  expect(await screen.findByText("El link de recuperacion vencio.")).toBeInTheDocument()
  expect(screen.getByLabelText("Nueva contrasena")).toHaveAttribute(
    "aria-invalid",
    "true"
  )
  expect(screen.getByLabelText("Repetir contrasena")).toHaveAttribute(
    "aria-invalid",
    "true"
  )
})
