const requestPasswordReset = jest.fn()
jest.mock("@/app/(auth)/actions", () => ({
  requestPasswordReset: (...args: unknown[]) => requestPasswordReset(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ForgotPasswordForm } from "./forgot-password-form"

beforeEach(() => {
  jest.clearAllMocks()
  requestPasswordReset.mockResolvedValue({})
})

test("manda el email y muestra la respuesta de la action", async () => {
  requestPasswordReset.mockResolvedValue({
    ok: true,
    message: "Si el email esta registrado, te enviamos un link.",
  })
  render(<ForgotPasswordForm />)

  await userEvent.type(screen.getByLabelText("Email"), "nico@shopping.com")
  await userEvent.click(screen.getByRole("button", { name: "Enviar link" }))

  expect(Object.fromEntries(requestPasswordReset.mock.calls[0][1] as FormData)).toEqual({
    email: "nico@shopping.com",
  })
  expect(
    await screen.findByText("Si el email esta registrado, te enviamos un link.")
  ).toBeInTheDocument()
})

test("marca el email invalido", async () => {
  requestPasswordReset.mockResolvedValue({
    ok: false,
    fieldErrors: { email: ["Ingresa un email valido."] },
  })
  render(<ForgotPasswordForm />)

  await userEvent.type(screen.getByLabelText("Email"), "nico@shopping.com")
  await userEvent.click(screen.getByRole("button", { name: "Enviar link" }))

  expect(await screen.findByText("Ingresa un email valido.")).toBeInTheDocument()
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
})
