import { argumentos, crearSupabaseMock, type Consulta } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

import { render, screen, within } from "@testing-library/react"

import type { Quote } from "@/schemas/quote"

import CotizacionesPage, { metadata } from "./page"

const ORION = {
  id: "88888888-8888-4888-8888-888888888888",
  slug: "orion",
  name: "Sistema Orion",
  login_url: "https://orion.com/login",
  last_sync_at: null as string | null,
}
const CLAIMS = {
  id: "99999999-9999-4999-8999-999999999999",
  slug: "claims",
  name: "Claims Center",
  login_url: "https://claims.com/login",
  last_sync_at: null as string | null,
}

/** Hoy a las 10:00 de Argentina, para que el dia no dependa del reloj. */
const hoy = (hora: number, minutos = 0) => {
  const ahora = new Date()
  return new Date(
    Date.UTC(
      ahora.getUTCFullYear(),
      ahora.getUTCMonth(),
      ahora.getUTCDate(),
      hora + 3,
      minutos
    )
  ).toISOString()
}

const cotizacion = (override: Partial<Quote> = {}): Quote => ({
  id: "11111111-1111-4111-8111-111111111111",
  platform_id: ORION.id,
  external_id: "266472296",
  nro_siniestro: "2004100971",
  compania: "SANCOR",
  perito: "CABRERA LEANDRO",
  vehiculo: "VOLKSWAGEN AMAROK",
  patente: "AF-232-AO",
  vin: null,
  anio: null,
  zona: "El Dorado",
  provincia: "Misiones",
  cant_piezas: 3,
  es_asegurado: true,
  estado: "Pendiente",
  fecha_pedido: hoy(10),
  fecha_vencimiento: null,
  detail: null,
  detail_synced_at: null,
  tiene_piezas: false,
  first_seen_at: hoy(10),
  synced_at: hoy(10),
  raw: {},
  ...override,
})

const esQuotes = (consulta: Consulta) => consulta.tabla === "quotes"

const escenario = ({
  platforms = [ORION, CLAIMS] as unknown[] | null,
  cotizaciones = [] as Quote[] | null,
  count = 0 as number | null,
}) => {
  mock.responde((consulta) =>
    esQuotes(consulta)
      ? { data: cotizaciones, error: null, count }
      : { data: platforms, error: null }
  )
}

const pagina = (plataforma?: string) =>
  CotizacionesPage({ params: Promise.resolve({}), searchParams: Promise.resolve(plataforma ? { plataforma } : {}) })

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireAuthenticatedProfile.mockResolvedValue({ id: "user-1" })
})

test("exige sesion y lista el dia de hoy, lo mas nuevo primero", async () => {
  escenario({ cotizaciones: [cotizacion()], count: 1 })

  render(await pagina())

  expect(metadata.title).toBe("Cotizaciones")
  expect(requireAuthenticatedProfile).toHaveBeenCalled()

  const quotes = mock.consultas.find(esQuotes) as Consulta
  expect(argumentos(quotes, "select")).toEqual(["*", { count: "exact" }])
  expect(argumentos(quotes, "eq")).toEqual(["es_asegurado", true])
  expect(argumentos(quotes, "order")).toEqual(["fecha_pedido", { ascending: false }])
  expect(argumentos(quotes, "limit")).toEqual([1000])
  // El piso es el arranque del dia de Argentina, no el de UTC.
  expect(String(argumentos(quotes, "gte")?.[1])).toContain("T03:00:00.000Z")

  expect(screen.getByText(/1 pedidos de asegurados del/)).toBeInTheDocument()
  expect(screen.getByRole("cell", { name: "SANCOR CABRERA LEANDRO" })).toBeInTheDocument()
  expect(screen.getByRole("cell", { name: "2004100971" })).toBeInTheDocument()
  // Sin plataforma elegida se muestra de cual salio cada fila.
  expect(screen.getByRole("columnheader", { name: "Plataforma" })).toBeInTheDocument()
  expect(screen.getByRole("cell", { name: "Sistema Orion" })).toBeInTheDocument()
})

test("filtrar por plataforma acota la consulta y ofrece abrir el portal", async () => {
  escenario({
    platforms: [{ ...ORION, last_sync_at: hoy(9, 30) }, CLAIMS],
    cotizaciones: [cotizacion()],
    count: 1,
  })

  render(await pagina("orion"))

  const quotes = mock.consultas.find(esQuotes) as Consulta
  expect(
    quotes.ops.filter(([metodo]) => metodo === "eq").map(([, args]) => args)
  ).toEqual([["es_asegurado", true], ["platform_id", ORION.id]])

  expect(screen.getByText(/en Sistema Orion, del mas nuevo al mas viejo/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Abrir Sistema Orion" })).toHaveAttribute(
    "href",
    "https://orion.com/login"
  )
  expect(screen.getByText(/^Actualizado /)).toBeInTheDocument()
  // Con una plataforma elegida la columna deja de tener sentido.
  expect(screen.queryByRole("columnheader", { name: "Plataforma" })).toBeNull()
})

test("una plataforma que no existe se ignora y quedan todas", async () => {
  escenario({ cotizaciones: [cotizacion()], count: 1 })

  render(await pagina("inexistente"))

  const quotes = mock.consultas.find(esQuotes) as Consulta
  expect(quotes.ops.filter(([metodo]) => metodo === "eq")).toHaveLength(1)
  expect(screen.queryByRole("link", { name: /Abrir/ })).toBeNull()
})

test("los botones marcan la plataforma activa", async () => {
  escenario({ cotizaciones: [], count: 0 })

  const { unmount } = render(await pagina())
  expect(screen.getByRole("button", { name: "Todas" }).className).toContain(
    "bg-primary"
  )
  unmount()

  render(await pagina("claims"))
  expect(screen.getByRole("button", { name: "Claims Center" })).toHaveAttribute(
    "href",
    "/?plataforma=claims"
  )
  expect(screen.getByRole("button", { name: "Claims Center" }).className).toContain(
    "bg-primary"
  )
  expect(screen.getByRole("button", { name: "Sistema Orion" }).className).not.toContain(
    "bg-primary"
  )
})

test("sin cotizaciones explica como forzar la sincronizacion", async () => {
  escenario({ cotizaciones: [], count: null })
  const { unmount } = render(await pagina())

  expect(screen.getByText(/0 pedidos de asegurados/)).toBeInTheDocument()
  expect(screen.getByText(/Todavia no hay cotizaciones de hoy/)).toBeInTheDocument()
  unmount()

  // Y si la consulta falla tampoco rompe.
  escenario({ platforms: null, cotizaciones: null, count: null })
  render(await pagina())
  expect(screen.getByText(/Todavia no hay cotizaciones de hoy/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Todas" })).toBeInTheDocument()
})

test("el vencimiento se muestra en horas, minutos o vencida", async () => {
  const ahora = Date.now()
  escenario({
    count: 4,
    cotizaciones: [
      cotizacion({
        id: "a",
        fecha_vencimiento: new Date(ahora + 3 * 3600_000).toISOString(),
      }),
      cotizacion({
        id: "b",
        fecha_vencimiento: new Date(ahora + 30 * 60_000).toISOString(),
      }),
      cotizacion({
        id: "c",
        fecha_vencimiento: new Date(ahora - 60_000).toISOString(),
      }),
      cotizacion({ id: "d", fecha_vencimiento: null }),
    ],
  })

  render(await pagina())

  const badge = (texto: string | RegExp) =>
    screen.getByText(texto, { selector: "[data-slot=badge]" })
  // Mas de dos horas: tranquilo (el minuto exacto depende del reloj).
  expect(badge(/^\dh \d+m$/).className).toContain("bg-secondary")
  // Menos de dos horas y vencida: urgente.
  expect(badge(/^\d+m$/).className).toContain("text-destructive")
  expect(badge("vencida").className).toContain("text-destructive")
  // Sin fecha de vencimiento el badge queda vacio.
  expect(
    document.querySelectorAll("[data-slot=badge]:empty").length
  ).toBeGreaterThan(0)
})

test("la fila muestra anio y VIN cuando el detalle ya los trajo", async () => {
  escenario({
    count: 2,
    cotizaciones: [
      cotizacion({ id: "a", anio: "2019", vin: "8AWDA45ZXKA123456" }),
      cotizacion({
        id: "b",
        fecha_pedido: null,
        platform_id: "otra-plataforma",
        vehiculo: "FORD RANGER",
      }),
    ],
  })

  render(await pagina())

  const conDetalle = screen.getByText(/VOLKSWAGEN AMAROK/).closest("td") as HTMLElement
  expect(conDetalle).toHaveTextContent("(2019)")
  expect(within(conDetalle).getByText(/8AWDA45ZXKA123456/)).toBeInTheDocument()
  // Una fila de una plataforma que ya no esta activa no rompe la tabla.
  expect(screen.getByRole("cell", { name: "-" })).toBeInTheDocument()
  // Sin hora de pedido el link al detalle sigue teniendo texto.
  expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/cotizaciones/b")
})

test("avisa cuando el tope de filas tapa cotizaciones", async () => {
  escenario({ cotizaciones: [cotizacion()], count: 1200 })

  render(await pagina())

  expect(
    screen.getByText(/Se listan las primeras 1000 de 1200/)
  ).toBeInTheDocument()
})
