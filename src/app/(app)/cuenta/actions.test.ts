/**
 * @jest-environment node
 */
import { argumentos, crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

const revalidatePath = jest.fn()
jest.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }))

import { initialActionState } from "@/lib/action-state"

import { changePassword, updateProfile } from "./actions"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

const perfil = { id: "user-1", email: "nico@shopping.com" }

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireAuthenticatedProfile.mockResolvedValue(perfil)
  mock.auth.signInWithPassword.mockResolvedValue({ error: null })
  mock.auth.updateUser.mockResolvedValue({ error: null })
})

test("el perfil solo se guarda validado y contra el id de la sesion", async () => {
  await expect(
    updateProfile(initialActionState, form({ full_name: "N" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.consultas).toHaveLength(0)

  await expect(
    // Un id en el formulario no se mira: el de la sesion manda.
    updateProfile(initialActionState, form({ full_name: "Nico Shopping", id: "otro" }))
  ).resolves.toEqual({ ok: true, message: "Datos actualizados." })

  const consulta = mock.consulta("update")
  expect(argumentos(consulta, "update")).toEqual([{ full_name: "Nico Shopping" }])
  expect(argumentos(consulta, "eq")).toEqual(["id", "user-1"])
  expect(revalidatePath).toHaveBeenCalledWith("/cuenta")
})

test("si la base rechaza el perfil se avisa sin revalidar", async () => {
  mock.responde(() => ({ error: { message: "constraint" } }))

  await expect(
    updateProfile(initialActionState, form({ full_name: "Nico Shopping" }))
  ).resolves.toMatchObject({ message: "No pudimos guardar los cambios." })
  expect(revalidatePath).not.toHaveBeenCalled()
})

const CAMBIO = {
  currentPassword: "Vieja2026",
  password: "Nueva2026",
  confirmPassword: "Nueva2026",
}

test("el cambio de contrasena valida el formulario", async () => {
  await expect(
    changePassword(initialActionState, form({ ...CAMBIO, confirmPassword: "otra" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.auth.signInWithPassword).not.toHaveBeenCalled()
})

test("el cambio de contrasena re-autentica con la actual", async () => {
  await expect(changePassword(initialActionState, form(CAMBIO))).resolves.toEqual({
    ok: true,
    message: "Contrasena actualizada.",
  })
  expect(mock.auth.signInWithPassword).toHaveBeenCalledWith({
    email: "nico@shopping.com",
    password: "Vieja2026",
  })
  expect(mock.auth.updateUser).toHaveBeenCalledWith({ password: "Nueva2026" })
})

test("con la contrasena actual equivocada no se cambia nada", async () => {
  mock.auth.signInWithPassword.mockResolvedValue({
    error: { message: "Invalid login credentials" },
  })

  await expect(changePassword(initialActionState, form(CAMBIO))).resolves.toEqual({
    ok: false,
    fieldErrors: { currentPassword: ["La contrasena actual no es correcta."] },
  })
  expect(mock.auth.updateUser).not.toHaveBeenCalled()
})

test("si Supabase rechaza la nueva contrasena se avisa", async () => {
  mock.auth.updateUser.mockResolvedValue({ error: { message: "too weak" } })

  await expect(changePassword(initialActionState, form(CAMBIO))).resolves.toMatchObject({
    message: "No pudimos cambiar la contrasena.",
  })
})
