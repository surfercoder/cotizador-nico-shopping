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

const syncOrion = jest.fn()
jest.mock("@/lib/orion-sync", () => ({ syncOrion: () => syncOrion() }))

import { initialActionState } from "@/lib/action-state"

import {
  createPlatform,
  deletePlatform,
  savePlatformCredentials,
  syncPlatformNow,
  updatePlatform,
} from "./actions"

const ID = "88888888-8888-4888-8888-888888888888"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

const ALTA = { name: "Orion", slug: "orion", login_url: "https://orion.com/login" }

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  mock.rpc.mockResolvedValue({ error: null })
  syncOrion.mockResolvedValue({ traidas: 3, detalles: 0, empresa: null })
})

test("todas las acciones exigen admin", async () => {
  await createPlatform(initialActionState, form(ALTA))
  await updatePlatform(initialActionState, form({ ...ALTA, platformId: ID }))
  await deletePlatform(initialActionState, form({ platformId: ID }))
  await savePlatformCredentials(
    initialActionState,
    form({ platformId: ID, username: "nico", password: "clave" })
  )
  await syncPlatformNow(initialActionState, form({ platformId: ID }))

  expect(requireRole).toHaveBeenCalledTimes(5)
  expect(requireRole).toHaveBeenCalledWith("admin")
})

test("el alta guarda la plataforma validada", async () => {
  await expect(
    createPlatform(initialActionState, form({ ...ALTA, slug: " ORION " }))
  ).resolves.toEqual({ ok: true, message: "Plataforma creada." })
  expect(argumentos(mock.consulta("insert"), "insert")).toEqual([ALTA])
  expect(revalidatePath).toHaveBeenCalledWith("/plataformas")

  await expect(
    createPlatform(initialActionState, form({ ...ALTA, login_url: "x" }))
  ).resolves.toMatchObject({ ok: false })
})

test("el alta distingue el slug repetido del resto de los errores", async () => {
  mock.responde(() => ({ error: { message: "duplicate", code: "23505" } }))
  await expect(createPlatform(initialActionState, form(ALTA))).resolves.toMatchObject({
    message: "Ya existe una plataforma con ese identificador.",
  })

  mock.responde(() => ({ error: { message: "rls" } }))
  await expect(createPlatform(initialActionState, form(ALTA))).resolves.toMatchObject({
    message: "No pudimos crear la plataforma.",
  })
})

test("la edicion no toca el slug", async () => {
  await expect(
    updatePlatform(
      initialActionState,
      form({ ...ALTA, platformId: ID, slug: "otro", isActive: "on" })
    )
  ).resolves.toEqual({ ok: true, message: "Plataforma actualizada." })

  const consulta = mock.consulta("update")
  expect(argumentos(consulta, "update")).toEqual([
    { name: "Orion", login_url: "https://orion.com/login", is_active: true },
  ])
  expect(argumentos(consulta, "eq")).toEqual(["id", ID])
})

test("la edicion valida y avisa si la base rechaza", async () => {
  await expect(
    updatePlatform(initialActionState, form({ ...ALTA, platformId: "1" }))
  ).resolves.toMatchObject({ ok: false })

  mock.responde(() => ({ error: { message: "rls" } }))
  await expect(
    updatePlatform(initialActionState, form({ ...ALTA, platformId: ID }))
  ).resolves.toMatchObject({ message: "No pudimos actualizar la plataforma." })
})

test("el borrado valida el id, borra y avisa si falla", async () => {
  await expect(
    deletePlatform(initialActionState, form({ platformId: "1" }))
  ).resolves.toMatchObject({ ok: false })

  await expect(
    deletePlatform(initialActionState, form({ platformId: ID }))
  ).resolves.toEqual({ ok: true, message: "Plataforma eliminada." })
  expect(argumentos(mock.consulta("delete"), "eq")).toEqual(["id", ID])

  mock.responde(() => ({ error: { message: "fk" } }))
  await expect(
    deletePlatform(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({ message: "No pudimos eliminar la plataforma." })
})

test("las credenciales van al vault por la funcion, nunca a una columna", async () => {
  await expect(
    savePlatformCredentials(initialActionState, form({ platformId: ID, username: "" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.rpc).not.toHaveBeenCalled()

  await expect(
    savePlatformCredentials(
      initialActionState,
      form({ platformId: ID, username: "nico", password: "clave" })
    )
  ).resolves.toEqual({ ok: true, message: "Credenciales guardadas." })
  expect(mock.rpc).toHaveBeenCalledWith("set_platform_credentials", {
    p_platform_id: ID,
    p_username: "nico",
    p_password: "clave",
  })

  mock.rpc.mockResolvedValue({ error: { message: "vault" } })
  await expect(
    savePlatformCredentials(
      initialActionState,
      form({ platformId: ID, username: "nico", password: "clave" })
    )
  ).resolves.toMatchObject({ message: "No pudimos guardar las credenciales." })
})

test("el sync a pedido solo corre para Orion", async () => {
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: "1" }))
  ).resolves.toMatchObject({ ok: false })

  // Una plataforma que no existe o que no es Orion no dispara nada.
  mock.responde(() => ({ data: null, error: null }))
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({
    message: "Todavia solo sabemos sincronizar Sistema Orion.",
  })

  mock.responde(() => ({ data: { slug: "audatex" }, error: null }))
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({
    message: "Todavia solo sabemos sincronizar Sistema Orion.",
  })
  expect(syncOrion).not.toHaveBeenCalled()
})

test("el sync a pedido cuenta lo que trajo y refresca las dos vistas", async () => {
  mock.responde(() => ({ data: { slug: "orion" }, error: null }))

  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({ message: "Listo: 3 cotizaciones sincronizadas." })
  expect(revalidatePath).toHaveBeenCalledWith("/plataformas")
  expect(revalidatePath).toHaveBeenCalledWith("/")

  syncOrion.mockResolvedValue({ traidas: 5, detalles: 2, empresa: "Trantor" })
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({
    message: "Listo: 5 cotizaciones sincronizadas (2 con detalle nuevo) para Trantor.",
  })
})

test("el sync que falla muestra el motivo sin romper la pagina", async () => {
  mock.responde(() => ({ data: { slug: "orion" }, error: null }))

  syncOrion.mockRejectedValue(new Error("Orion respondio 500"))
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({ ok: false, message: "Orion respondio 500" })
  expect(revalidatePath).toHaveBeenCalledWith("/plataformas")

  syncOrion.mockRejectedValue("cayo la red")
  await expect(
    syncPlatformNow(initialActionState, form({ platformId: ID }))
  ).resolves.toMatchObject({ message: "Fallo la sincronizacion." })
})
