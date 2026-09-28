/**
 * @jest-environment node
 */
import { crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))
jest.mock("@/lib/site-url", () => ({ getSiteUrl: async () => "https://app.test" }))
jest.mock("next/navigation", () => ({
  redirect: (destino: string) => {
    throw new Error(`REDIRECT:${destino}`)
  },
}))

import { initialActionState } from "@/lib/action-state"

import { login, logout, requestPasswordReset, signup, updatePassword } from "./actions"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

const CREDENCIALES = { email: "nico@shopping.com", password: "Nico2026" }

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  mock.auth.signInWithPassword.mockResolvedValue({ error: null })
  mock.auth.signUp.mockResolvedValue({ data: { session: { id: "s" } }, error: null })
  mock.auth.updateUser.mockResolvedValue({ error: null })
  mock.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } })
  mock.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  mock.auth.signOut.mockResolvedValue({ error: null })
})

test("el login valida el formulario antes de pegarle a Supabase", async () => {
  const state = await login(initialActionState, form({ email: "x", password: "" }))

  expect(state.ok).toBe(false)
  expect(state.fieldErrors).toMatchObject({ email: expect.any(Array) })
  expect(mock.auth.signInWithPassword).not.toHaveBeenCalled()
})

test("el login entra a la home o al next pedido", async () => {
  await expect(login(initialActionState, form(CREDENCIALES))).rejects.toThrow(
    "REDIRECT:/"
  )
  await expect(
    login(initialActionState, form({ ...CREDENCIALES, next: "/catalogos" }))
  ).rejects.toThrow("REDIRECT:/catalogos")
})

test("el login traduce los errores conocidos y esconde el resto", async () => {
  mock.auth.signInWithPassword.mockResolvedValue({
    error: { message: "Invalid login credentials" },
  })
  await expect(login(initialActionState, form(CREDENCIALES))).resolves.toEqual({
    ok: false,
    message: "Email o contrasena incorrectos.",
    fieldErrors: undefined,
  })

  mock.auth.signInWithPassword.mockResolvedValue({
    error: { message: "pq: duplicate key value violates unique constraint" },
  })
  await expect(login(initialActionState, form(CREDENCIALES))).resolves.toMatchObject({
    message: "No pudimos completar la operacion. Intenta de nuevo.",
  })
})

const REGISTRO = {
  fullName: "Nico Shopping",
  email: "nico@shopping.com",
  password: "Nico2026",
  confirmPassword: "Nico2026",
}

test("el registro valida y manda el nombre y el link de confirmacion", async () => {
  await expect(
    signup(initialActionState, form({ ...REGISTRO, confirmPassword: "otra" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.auth.signUp).not.toHaveBeenCalled()

  await expect(signup(initialActionState, form(REGISTRO))).rejects.toThrow(
    "REDIRECT:/cuenta-inactiva"
  )
  expect(mock.auth.signUp).toHaveBeenCalledWith({
    email: "nico@shopping.com",
    password: "Nico2026",
    options: {
      data: { full_name: "Nico Shopping" },
      emailRedirectTo: "https://app.test/auth/callback",
    },
  })
})

test("sin sesion el registro manda a verificar el email", async () => {
  mock.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })

  await expect(signup(initialActionState, form(REGISTRO))).rejects.toThrow(
    "REDIRECT:/verificar-email"
  )
})

test("el registro avisa cuando Supabase rechaza", async () => {
  mock.auth.signUp.mockResolvedValue({
    data: {},
    error: { message: "Email rate limit exceeded" },
  })

  await expect(signup(initialActionState, form(REGISTRO))).resolves.toMatchObject({
    message: "Demasiados intentos. Espera unos minutos y proba de nuevo.",
  })
})

test("el recupero contesta lo mismo exista o no la cuenta", async () => {
  await expect(
    requestPasswordReset(initialActionState, form({ email: "no-es-mail" }))
  ).resolves.toMatchObject({ ok: false })

  await expect(
    requestPasswordReset(initialActionState, form({ email: "nico@shopping.com" }))
  ).resolves.toEqual({
    ok: true,
    message:
      "Si el email esta registrado, te enviamos un link para recuperar la contrasena.",
  })
  expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith("nico@shopping.com", {
    redirectTo: "https://app.test/auth/callback?next=/actualizar-password",
  })
})

const NUEVA = { password: "Nueva2026", confirmPassword: "Nueva2026" }

test("el cambio por link valida, exige sesion y avisa si vencio", async () => {
  await expect(
    updatePassword(initialActionState, form({ ...NUEVA, confirmPassword: "otra" }))
  ).resolves.toMatchObject({ ok: false })

  mock.auth.getUser.mockResolvedValue({ data: { user: null } })
  await expect(updatePassword(initialActionState, form(NUEVA))).resolves.toMatchObject({
    message:
      "El link de recuperacion vencio. Pedi uno nuevo desde 'Olvide mi contrasena'.",
  })
  expect(mock.auth.updateUser).not.toHaveBeenCalled()
})

test("el cambio por link guarda la contrasena y entra a la app", async () => {
  await expect(updatePassword(initialActionState, form(NUEVA))).rejects.toThrow(
    "REDIRECT:/"
  )
  expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: "Nueva2026" })

  mock.auth.updateUser.mockResolvedValue({ error: { message: "Password is too weak" } })
  await expect(updatePassword(initialActionState, form(NUEVA))).resolves.toMatchObject({
    message: "No pudimos completar la operacion. Intenta de nuevo.",
  })
})

test("el logout cierra la sesion y vuelve al login", async () => {
  await expect(logout()).rejects.toThrow("REDIRECT:/login")
  expect(mock.auth.signOut).toHaveBeenCalled()
})
