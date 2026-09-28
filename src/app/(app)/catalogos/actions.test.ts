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

import {
  createCatalog,
  deleteCatalog,
  saveCatalogCredentials,
  updateCatalog,
} from "./actions"

const ID = "77777777-7777-4777-8777-777777777777"

const form = (campos: Record<string, string>) => {
  const formData = new FormData()
  for (const [nombre, valor] of Object.entries(campos)) formData.set(nombre, valor)
  return formData
}

const ALTA = {
  name: "Repuestos Sur",
  slug: "repuestos-sur",
  url: "https://repuestos.com",
  brands: "Ford, Citroën",
  requiresAuth: "on",
}

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  mock.rpc.mockResolvedValue({ error: null })
})

test("todas las acciones exigen admin", async () => {
  await createCatalog(initialActionState, form(ALTA))
  await updateCatalog(initialActionState, form({ ...ALTA, catalogId: ID }))
  await deleteCatalog(initialActionState, form({ catalogId: ID }))
  await saveCatalogCredentials(
    initialActionState,
    form({ catalogId: ID, username: "nico", password: "clave" })
  )

  expect(requireRole).toHaveBeenCalledTimes(4)
  expect(requireRole).toHaveBeenCalledWith("admin")
})

test("el alta guarda las marcas normalizadas", async () => {
  await expect(createCatalog(initialActionState, form(ALTA))).resolves.toEqual({
    ok: true,
    message: "Catalogo creado.",
  })

  expect(argumentos(mock.consulta("insert"), "insert")).toEqual([
    {
      name: "Repuestos Sur",
      slug: "repuestos-sur",
      url: "https://repuestos.com",
      brands: ["ford", "citroen"],
      requires_auth: true,
      notes: null,
    },
  ])
  expect(revalidatePath).toHaveBeenCalledWith("/catalogos")
})

test("el alta no llega a la base con datos invalidos", async () => {
  await expect(
    createCatalog(initialActionState, form({ ...ALTA, url: "no-url" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.consultas).toHaveLength(0)
})

test("el alta distingue el slug repetido del resto de los errores", async () => {
  mock.responde(() => ({ error: { message: "duplicate", code: "23505" } }))
  await expect(createCatalog(initialActionState, form(ALTA))).resolves.toMatchObject({
    message: "Ya existe un catalogo con ese identificador.",
  })

  mock.responde(() => ({ error: { message: "rls" } }))
  await expect(createCatalog(initialActionState, form(ALTA))).resolves.toMatchObject({
    message: "No pudimos crear el catalogo.",
  })
  expect(revalidatePath).not.toHaveBeenCalled()
})

test("la edicion guarda los campos editables contra el id del formulario", async () => {
  await expect(
    updateCatalog(
      initialActionState,
      form({ ...ALTA, catalogId: ID, isActive: "on", notes: "solo mayoristas" })
    )
  ).resolves.toEqual({ ok: true, message: "Catalogo actualizado." })

  const consulta = mock.consulta("update")
  expect(argumentos(consulta, "update")).toEqual([
    {
      name: "Repuestos Sur",
      url: "https://repuestos.com",
      brands: ["ford", "citroen"],
      requires_auth: true,
      is_active: true,
      notes: "solo mayoristas",
    },
  ])
  expect(argumentos(consulta, "eq")).toEqual(["id", ID])
})

test("la edicion valida y avisa si la base rechaza", async () => {
  await expect(
    updateCatalog(initialActionState, form({ ...ALTA, catalogId: "1" }))
  ).resolves.toMatchObject({ ok: false })

  mock.responde(() => ({ error: { message: "rls" } }))
  await expect(
    updateCatalog(initialActionState, form({ ...ALTA, catalogId: ID }))
  ).resolves.toMatchObject({ message: "No pudimos actualizar el catalogo." })
})

test("el borrado valida el id, borra y avisa si falla", async () => {
  await expect(
    deleteCatalog(initialActionState, form({ catalogId: "1" }))
  ).resolves.toMatchObject({ ok: false })

  await expect(
    deleteCatalog(initialActionState, form({ catalogId: ID }))
  ).resolves.toEqual({ ok: true, message: "Catalogo eliminado." })
  expect(argumentos(mock.consulta("delete"), "eq")).toEqual(["id", ID])

  mock.responde(() => ({ error: { message: "fk" } }))
  await expect(
    deleteCatalog(initialActionState, form({ catalogId: ID }))
  ).resolves.toMatchObject({ message: "No pudimos eliminar el catalogo." })
})

test("las credenciales van al vault por la funcion, nunca a una columna", async () => {
  await expect(
    saveCatalogCredentials(initialActionState, form({ catalogId: ID, username: "" }))
  ).resolves.toMatchObject({ ok: false })
  expect(mock.rpc).not.toHaveBeenCalled()

  await expect(
    saveCatalogCredentials(
      initialActionState,
      form({ catalogId: ID, username: "nico", password: "clave" })
    )
  ).resolves.toEqual({ ok: true, message: "Credenciales guardadas." })
  expect(mock.rpc).toHaveBeenCalledWith("set_catalog_credentials", {
    p_catalog_id: ID,
    p_username: "nico",
    p_password: "clave",
  })
  expect(mock.consultas).toHaveLength(0)

  mock.rpc.mockResolvedValue({ error: { message: "vault" } })
  await expect(
    saveCatalogCredentials(
      initialActionState,
      form({ catalogId: ID, username: "nico", password: "clave" })
    )
  ).resolves.toMatchObject({ message: "No pudimos guardar las credenciales." })
})
