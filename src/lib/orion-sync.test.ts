/**
 * @jest-environment node
 */
import type { OrionDetalle } from "@/lib/orion"
import {
  argumentos,
  crearSupabaseMock,
  type Consulta,
  type Respuesta,
} from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mock.supabase }))

const login = jest.fn()
const fetchCotizaciones = jest.fn()
const fetchDetalles = jest.fn()
jest.mock("@/lib/orion", () => ({
  ...jest.requireActual("@/lib/orion"),
  login: (...args: unknown[]) => login(...args),
  fetchCotizaciones: (...args: unknown[]) => fetchCotizaciones(...args),
  fetchDetalles: (...args: unknown[]) => fetchDetalles(...args),
}))

import { syncOrion } from "./orion-sync"

const PLATFORM_ID = "44444444-4444-4444-8444-444444444444"
const plataforma = { id: PLATFORM_ID, name: "Orion", is_active: true }

const fila = (id: number) => ({
  idCotizacion: id,
  idCotizacionEncrypt: `enc-${id}`,
  nroSiniestro: null,
  compania: null,
  perito: null,
  vehiculo: null,
  patente: null,
  cantPiezas: null,
  tipoAsegurado: "True",
  fechaPedido: "/Date(1790277420000)/",
  fechaVencimiento: "/Date(1790281200000)/",
  Estado: null,
  zona: null,
})

const detalle = (vin: string) => ({ vin }) as OrionDetalle

const op = (consulta: Consulta, nombre: string) => argumentos(consulta, nombre)

const esSelectDePendientes = (consulta: Consulta) =>
  consulta.tabla === "quotes" && consulta.ops.some(([metodo]) => metodo === "select")

/** Escenario feliz; cada test sobreescribe lo que necesita. */
const escenario = ({
  pendientes = {} as Record<"sin-detalle" | "sin-piezas", string[]>,
  platformResult = { data: plataforma, error: null } as Respuesta,
  upsertResult = { error: null } as Respuesta,
} = {}) => {
  mock.responde((consulta) => {
    if (consulta.tabla === "platforms") {
      return op(consulta, "update") ? { error: null } : platformResult
    }
    if (esSelectDePendientes(consulta)) {
      const filtro = op(consulta, "is")?.[0] === "detail" ? "sin-detalle" : "sin-piezas"
      return {
        data: (pendientes[filtro] ?? []).map((external_id) => ({ external_id })),
        error: null,
      }
    }
    return upsertResult
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  escenario()
  mock.rpc.mockResolvedValue({ data: [{ username: "nico", password: "clave" }] })
  login.mockResolvedValue({ cookie: "ck", empresaId: 77, empresa: "Trantor" })
  fetchCotizaciones.mockResolvedValue([])
  fetchDetalles.mockResolvedValue(new Map())
})

test("sin la plataforma cargada no hay nada que sincronizar", async () => {
  escenario({ platformResult: { data: null, error: { message: "no rows" } } })
  await expect(syncOrion()).rejects.toThrow("No existe la plataforma orion")

  escenario({ platformResult: { data: null, error: null } })
  await expect(syncOrion()).rejects.toThrow("No existe la plataforma orion")

  expect(login).not.toHaveBeenCalled()
})

test("la plataforma apagada devuelve la corrida vacia sin loguearse", async () => {
  escenario({ platformResult: { data: { ...plataforma, is_active: false }, error: null } })

  await expect(syncOrion()).resolves.toEqual({
    plataforma: "Orion",
    traidas: 0,
    detalles: 0,
    empresa: null,
  })
  expect(login).not.toHaveBeenCalled()
})

test("sin credenciales corta y deja el motivo en la plataforma", async () => {
  mock.rpc.mockResolvedValue({ data: [] })

  await expect(syncOrion()).rejects.toThrow(
    "La plataforma no tiene credenciales cargadas"
  )

  const update = mock.consultas.find((consulta) => op(consulta, "update"))
  expect(op(update as Consulta, "update")?.[0]).toMatchObject({
    last_sync_error: "La plataforma no tiene credenciales cargadas",
  })
})

test("sin datos de credenciales tampoco arranca", async () => {
  mock.rpc.mockResolvedValue({ data: null })

  await expect(syncOrion()).rejects.toThrow(
    "La plataforma no tiene credenciales cargadas"
  )
})

test("un error que no es Error queda registrado igual", async () => {
  login.mockRejectedValue("cayo la red")

  await expect(syncOrion()).rejects.toBe("cayo la red")

  const update = mock.consultas.find((consulta) => op(consulta, "update"))
  expect(op(update as Consulta, "update")?.[0]).toMatchObject({
    last_sync_error: "Error desconocido",
  })
})

test("trae las dos solapas, marca las en proceso y guarda todo junto", async () => {
  fetchCotizaciones
    .mockResolvedValueOnce([fila(1)])
    .mockResolvedValueOnce([fila(2)])

  const resultado = await syncOrion()

  expect(resultado).toEqual({
    plataforma: "Orion",
    traidas: 2,
    detalles: 0,
    empresa: "Trantor",
  })

  // El piso de fechaPedido es el arranque de ayer en Argentina.
  const ayer = new Date(Date.now() - 24 * 60 * 60_000).toISOString().slice(0, 10)
  expect(fetchCotizaciones.mock.calls[0][0].desde).toContain(ayer.slice(0, 7))

  const upsert = mock.consultas.find((consulta) => op(consulta, "upsert"))
  const filas = op(upsert as Consulta, "upsert")?.[0] as { estado: string | null }[]
  expect(filas).toHaveLength(2)
  expect(filas[0].estado).toBeNull()
  expect(filas[1].estado).toBe("En proceso")

  // Y la corrida queda marcada como exitosa.
  const update = mock.consultas.find((consulta) => op(consulta, "update"))
  expect(op(update as Consulta, "update")?.[0]).toMatchObject({ last_sync_error: null })
})

test("sin cotizaciones no se escribe en quotes", async () => {
  await expect(syncOrion()).resolves.toMatchObject({ traidas: 0 })
  expect(mock.consultas.some((consulta) => op(consulta, "upsert"))).toBe(false)
})

test("si falla el upsert de las cotizaciones corta la corrida", async () => {
  fetchCotizaciones.mockResolvedValueOnce([fila(1)])
  escenario({ upsertResult: { error: { message: "violates not-null" } } })

  await expect(syncOrion()).rejects.toThrow(
    "No pudimos guardar las cotizaciones: violates not-null"
  )
})

test("pide el detalle de las que estan en proceso y completa con las nuevas", async () => {
  fetchCotizaciones
    .mockResolvedValueOnce([fila(1)])
    .mockResolvedValueOnce([fila(2)])
  escenario({ pendientes: { "sin-piezas": ["2"], "sin-detalle": ["1"] } })
  fetchDetalles.mockImplementation(async ({ encryptedIds }: { encryptedIds: string[] }) =>
    new Map(encryptedIds.map((id) => [id, detalle(`vin-${id}`)]))
  )

  await expect(syncOrion()).resolves.toMatchObject({ detalles: 2 })

  const upserts = mock.consultas
    .filter((consulta) => op(consulta, "upsert"))
    .map((consulta) => op(consulta, "upsert")?.[0] as Record<string, unknown>[])

  // El primero es el de la grilla; despues uno por tanda de detalles.
  expect(upserts[1][0]).toMatchObject({
    external_id: "2",
    estado: "En proceso",
    detail: { vin: "vin-enc-2" },
  })
  // De las nuevas no se toca el estado.
  expect(upserts[2][0].estado).toBeNull()
})

test("no pide detalles de las que ya los tienen", async () => {
  fetchCotizaciones.mockResolvedValue([fila(1)])
  // Postgres devuelve data null si la consulta falla: no puede romper la tanda.
  mock.responde((consulta) => {
    if (consulta.tabla === "platforms") {
      return op(consulta, "update") ? { error: null } : { data: plataforma, error: null }
    }
    if (esSelectDePendientes(consulta)) return { data: null, error: null }
    return { error: null }
  })

  await expect(syncOrion()).resolves.toMatchObject({ detalles: 0 })
  expect(fetchDetalles).not.toHaveBeenCalled()
})

test("el detalle que Orion no devolvio no se guarda", async () => {
  fetchCotizaciones.mockResolvedValueOnce([]).mockResolvedValueOnce([fila(2)])
  escenario({ pendientes: { "sin-piezas": ["2"], "sin-detalle": [] } })
  fetchDetalles.mockResolvedValue(new Map())

  await expect(syncOrion()).resolves.toMatchObject({ detalles: 0 })
  expect(mock.consultas.filter((consulta) => op(consulta, "upsert"))).toHaveLength(1)
})

test("si falla el upsert del detalle corta la corrida", async () => {
  fetchCotizaciones.mockResolvedValueOnce([]).mockResolvedValueOnce([fila(2)])
  mock.responde((consulta) => {
    if (consulta.tabla === "platforms") {
      return op(consulta, "update") ? { error: null } : { data: plataforma, error: null }
    }
    if (esSelectDePendientes(consulta)) {
      return { data: [{ external_id: "2" }], error: null }
    }
    // Solo falla el upsert del detalle; el de la grilla entra bien.
    const filas = op(consulta, "upsert")?.[0] as { detail?: unknown }[]
    return filas[0].detail ? { error: { message: "detail invalido" } } : { error: null }
  })
  fetchDetalles.mockResolvedValue(new Map([["enc-2", detalle("vin-2")]]))

  await expect(syncOrion()).rejects.toThrow(
    "No pudimos guardar el detalle: detail invalido"
  )
})

test("cuando las en proceso llenan el cupo no queda lugar para las nuevas", async () => {
  const enProceso = Array.from({ length: 60 }, (_, i) => fila(i + 100))
  fetchCotizaciones.mockResolvedValueOnce([fila(1)]).mockResolvedValueOnce(enProceso)
  escenario({
    pendientes: {
      "sin-piezas": enProceso.map((quote) => String(quote.idCotizacion)),
      "sin-detalle": ["1"],
    },
  })
  fetchDetalles.mockImplementation(async ({ encryptedIds }: { encryptedIds: string[] }) =>
    new Map(encryptedIds.map((id) => [id, detalle(`vin-${id}`)]))
  )

  await expect(syncOrion()).resolves.toMatchObject({ detalles: 60 })
  // Una sola tanda de detalles: la de las nuevas no se llego a pedir.
  expect(fetchDetalles).toHaveBeenCalledTimes(1)
})
