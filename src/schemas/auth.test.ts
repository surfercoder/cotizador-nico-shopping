/**
 * @jest-environment node
 */
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  signupSchema,
  updatePasswordSchema,
} from "./auth"

const errores = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? []

test("el email se normaliza y se valida", () => {
  expect(forgotPasswordSchema.parse({ email: "  NICO@Shopping.com " })).toEqual({
    email: "nico@shopping.com",
  })
  expect(forgotPasswordSchema.safeParse({ email: "no-es-mail" }).success).toBe(false)
})

test("login solo acepta un next de la allowlist, para no habilitar open redirects", () => {
  const base = { email: "nico@shopping.com", password: "secreta" }

  expect(loginSchema.parse({ ...base, next: "/catalogos" }).next).toBe("/catalogos")
  expect(loginSchema.parse({ ...base, next: "//evil.com" }).next).toBeUndefined()
  expect(loginSchema.parse({ ...base, next: "https://evil.com" }).next).toBeUndefined()
  // Y tampoco una ruta relativa que no sea de la app.
  expect(loginSchema.parse({ ...base, next: "/no-existe" }).next).toBeUndefined()
  expect(loginSchema.parse(base).next).toBeUndefined()
})

test("login exige la contrasena aunque no valide su formato", () => {
  const result = loginSchema.safeParse({ email: "nico@shopping.com", password: "" })
  expect(errores(result)).toContain("Ingresa tu contrasena.")
})

test("la politica de contrasena pide largo, letra y numero", () => {
  const conPassword = (password: string) =>
    errores(
      updatePasswordSchema.safeParse({ password, confirmPassword: password })
    )

  expect(conPassword("Nico2026")).toEqual([])
  expect(conPassword("Nico1")).toContain("Minimo 8 caracteres.")
  expect(conPassword("N1".padEnd(73, "a"))).toContain("Maximo 72 caracteres.")
  expect(conPassword("12345678")).toContain("Tiene que incluir al menos una letra.")
  expect(conPassword("abcdefgh")).toContain("Tiene que incluir al menos un numero.")
})

test("la confirmacion tiene que coincidir", () => {
  const result = updatePasswordSchema.safeParse({
    password: "Nico2026",
    confirmPassword: "Nico2027",
  })
  expect(errores(result)).toEqual(["Las contrasenas no coinciden."])
})

test("el registro pide nombre completo", () => {
  const base = {
    email: "nico@shopping.com",
    password: "Nico2026",
    confirmPassword: "Nico2026",
  }

  expect(signupSchema.parse({ ...base, fullName: " Nico Shopping " }).fullName).toBe(
    "Nico Shopping"
  )
  expect(errores(signupSchema.safeParse({ ...base, fullName: "N" }))).toContain(
    "Ingresa tu nombre completo."
  )
  expect(
    errores(signupSchema.safeParse({ ...base, fullName: "N".repeat(81) }))
  ).toContain("Maximo 80 caracteres.")
})

test("el cambio de contrasena exige la actual y que la nueva sea distinta", () => {
  expect(
    changePasswordSchema.safeParse({
      currentPassword: "Vieja2026",
      password: "Nueva2026",
      confirmPassword: "Nueva2026",
    }).success
  ).toBe(true)

  expect(
    errores(
      changePasswordSchema.safeParse({
        currentPassword: "",
        password: "Nueva2026",
        confirmPassword: "Nueva2026",
      })
    )
  ).toContain("Ingresa tu contrasena actual.")

  expect(
    errores(
      changePasswordSchema.safeParse({
        currentPassword: "Nueva2026",
        password: "Nueva2026",
        confirmPassword: "Nueva2026",
      })
    )
  ).toContain("La nueva contrasena tiene que ser distinta de la actual.")
})
