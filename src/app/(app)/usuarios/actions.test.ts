/**
 * @jest-environment node
 */
import { argumentos, crearSupabaseMock } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireRole = jest.fn()
jest.mock("@/lib/dal", () => ({ requireRole: (...roles: string[]) => requireRole(...roles) }))

const revalidatePath = jest.fn()
jest.mock("next/cache", () => ({ revalidatePath: (path: string) => revalidatePath(path) }))

import { initialActionState } from "@/lib/action-state"

import { updateUserAccess } from "./actions"

const ADMIN_ID = "55555555-5555-4555-8555-555555555555"
const OTRO_ID = "66666666-6666-4666-8666-666666666666"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireRole.mockResolvedValue({ id: ADMIN_ID })
})

test("solo el admin puede tocar los accesos", async () => {
  await updateUserAccess(initialActionState, form({ userId: OTRO_ID, role: "operador" }))

  expect(requireRole).toHaveBeenCalledWith("admin")
})

test("un formulario invalido no llega a la base", async () => {
  await expect(
    updateUserAccess(initialActionState, form({ userId: "1", role: "gerente" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.consultas).toHaveLength(0)
})

test("el admin no puede cambiarse el rol ni desactivarse a si mismo", async () => {
  await expect(
    updateUserAccess(
      initialActionState,
      form({ userId: ADMIN_ID, role: "operador", isActive: "on" })
    )
  ).resolves.toMatchObject({
    message: "No podes cambiar tu propio rol ni desactivarte.",
  })
  expect(mock.consultas).toHaveLength(0)
})

test("guarda rol y estado del usuario elegido", async () => {
  await expect(
    updateUserAccess(initialActionState, form({ userId: OTRO_ID, role: "supervisor" }))
  ).resolves.toEqual({ ok: true, message: "Usuario actualizado." })

  const consulta = mock.consulta("update")
  expect(argumentos(consulta, "update")).toEqual([
    { role: "supervisor", is_active: false },
  ])
  expect(argumentos(consulta, "eq")).toEqual(["id", OTRO_ID])
  expect(revalidatePath).toHaveBeenCalledWith("/usuarios")
})

test("si la base rechaza el cambio se avisa sin revalidar", async () => {
  mock.responde(() => ({ error: { message: "rls" } }))

  await expect(
    updateUserAccess(
      initialActionState,
      form({ userId: OTRO_ID, role: "admin", isActive: "on" })
    )
  ).resolves.toMatchObject({ message: "No pudimos actualizar el usuario." })
  expect(revalidatePath).not.toHaveBeenCalled()
})
