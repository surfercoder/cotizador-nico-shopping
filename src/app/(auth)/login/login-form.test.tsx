const login = jest.fn()
jest.mock("@/app/(auth)/actions", () => ({ login: (...args: unknown[]) => login(...args) }))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { LoginForm } from "./login-form"

/** Los campos son `required`: sin llenarlos el navegador no manda el form. */
const completar = async () => {
  await userEvent.type(screen.getByLabelText("Email"), "nico@shopping.com")
  await userEvent.type(screen.getByLabelText("Contrasena"), "Nico2026")
}

beforeEach(() => {
  jest.clearAllMocks()
  login.mockResolvedValue({})
})

test("manda email y contrasena a la action", async () => {
  render(<LoginForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

  const formData = login.mock.calls[0][1] as FormData
  expect(Object.fromEntries(formData)).toEqual({
    email: "nico@shopping.com",
    password: "Nico2026",
  })
})

test("el next viaja escondido para volver a donde el usuario iba", async () => {
  render(<LoginForm next="/catalogos" />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

  expect(Object.fromEntries(login.mock.calls[0][1] as FormData)).toMatchObject({
    next: "/catalogos",
  })
})

test("muestra el error general y marca los campos invalidos", async () => {
  login.mockResolvedValue({
    ok: false,
    message: "Email o contrasena incorrectos.",
    fieldErrors: { email: ["Ingresa un email valido."], password: ["Requerido."] },
  })
  render(<LoginForm />)

  await completar()
  await userEvent.click(screen.getByRole("button", { name: "Ingresar" }))

  expect(await screen.findByText("Email o contrasena incorrectos.")).toBeInTheDocument()
  expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByText("Ingresa un email valido.")).toBeInTheDocument()
  expect(screen.getByText("Requerido.")).toBeInTheDocument()
})

test("tiene salida hacia recuperar la contrasena", () => {
  render(<LoginForm />)

  expect(screen.getByRole("link", { name: "Olvide mi contrasena" })).toHaveAttribute(
    "href",
    "/recuperar"
  )
})
