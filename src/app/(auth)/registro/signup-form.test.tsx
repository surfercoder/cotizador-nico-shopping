const signup = jest.fn()
jest.mock("@/app/(auth)/actions", () => ({
  signup: (...args: unknown[]) => signup(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { SignupForm } from "./signup-form"

const completar = async () => {
  await userEvent.type(screen.getByLabelText("Nombre y apellido"), "Nico Shopping")
  await userEvent.type(screen.getByLabelText("Email"), "nico@shopping.com")
  await userEvent.type(screen.getByLabelText("Contrasena"), "Nico2026")
  await userEvent.type(screen.getByLabelText("Repetir contrasena"), "Nico2026")
}

beforeEach(() => {
  jest.clearAllMocks()
  signup.mockResolvedValue({})
})

test("manda los cuatro campos a la action", async () => {
  render(<SignupForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))

  expect(Object.fromEntries(signup.mock.calls[0][1] as FormData)).toEqual({
    fullName: "Nico Shopping",
    email: "nico@shopping.com",
    password: "Nico2026",
    confirmPassword: "Nico2026",
  })
})

test("muestra los errores por campo que devuelve la action", async () => {
  signup.mockResolvedValue({
    ok: false,
    fieldErrors: {
      fullName: ["Ingresa tu nombre completo."],
      email: ["Ingresa un email valido."],
      password: ["Minimo 8 caracteres."],
      confirmPassword: ["Las contrasenas no coinciden."],
    },
  })
  render(<SignupForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Crear cuenta" }))

  expect(
    await screen.findByText("Las contrasenas no coinciden.")
  ).toBeInTheDocument()
  for (const campo of [
    "Nombre y apellido",
    "Email",
    "Contrasena",
    "Repetir contrasena",
  ]) {
    expect(screen.getByLabelText(campo)).toHaveAttribute("aria-invalid", "true")
  }
})

test("avisa la politica de contrasena antes de que el usuario falle", () => {
  render(<SignupForm />)

  expect(
    screen.getByText("Minimo 8 caracteres, con letras y numeros.")
  ).toBeInTheDocument()
})
