import { crearSupabaseMock, argumentos, type Consulta } from "~test/supabase"

const mock = crearSupabaseMock()
jest.mock("@/lib/supabase/server", () => ({ createClient: async () => mock.supabase }))

const requireAuthenticatedProfile = jest.fn()
jest.mock("@/lib/dal", () => ({ requireAuthenticatedProfile: () => requireAuthenticatedProfile() }))

const notFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND")
})
jest.mock("next/navigation", () => ({ notFound: () => notFound() }))

import { render, screen } from "@testing-library/react"

import type { Catalog } from "@/schemas/catalog"
import type { Quote, QuoteItem } from "@/schemas/quote"

import CotizacionPage, { metadata } from "./page"

const ID = "11111111-1111-4111-8111-111111111111"

const pieza = (idPieza: number, override = {}) => ({
  id: idPieza * 10,
  idPieza,
  descripcion: "Paragolpes Del. (Con Impresion)",
  codRepuesto: "52119-0K021-00",
  ...override,
})

const cotizacion = (override: Partial<Quote> = {}): Quote => ({
  id: ID,
  platform_id: "88888888-8888-4888-8888-888888888888",
  external_id: "266496658",
  nro_siniestro: "2004100971",
  compania: "SANCOR",
  perito: "CABRERA LEANDRO",
  vehiculo: "TOYOTA HILUX",
  patente: "AF-232-AO",
  vin: "8AJFZ22G8C5021495",
  anio: "2012",
  zona: "Godoy Cruz",
  provincia: "Mendoza",
  cant_piezas: 2,
  es_asegurado: true,
  estado: "Pendiente",
  fecha_pedido: "2026-09-28T13:00:00.000Z",
  fecha_vencimiento: "2026-09-29T13:00:00.000Z",
  detail: {
    tipoMotor: "3.0 TD",
    color: { descripcion: "Blanco" },
    observPerito: "Revisar el frente completo",
    listRepuestos: [
      pieza(223),
      pieza(999999, { descripcion: "FLETE", codRepuesto: null }),
      pieza(674, { descripcion: "Rejilla del Paragolpes", codRepuesto: null }),
    ],
  },
  detail_synced_at: "2026-09-28T13:05:00.000Z",
  tiene_piezas: true,
  first_seen_at: "2026-09-28T13:00:00.000Z",
  synced_at: "2026-09-28T13:00:00.000Z",
  raw: {},
  ...override,
})

const partsouq: Catalog = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "partsouq",
  name: "PartSouq",
  url: "https://partsouq.com/es/",
  brands: ["toyota"],
  is_active: true,
  requires_auth: false,
  notes: null,
  created_at: "2026-09-25T00:00:00+00:00",
  updated_at: "2026-09-25T00:00:00+00:00",
}

const item = (override: Partial<QuoteItem> = {}): QuoteItem => ({
  quote_id: ID,
  orion_repuesto_id: 2230,
  part_number: "521190K021",
  price: 175.59,
  currency: "USD",
  catalog_id: partsouq.id,
  updated_at: "2026-10-05T00:00:00+00:00",
  updated_by: null,
  ...override,
})

/** Cada tabla contesta lo suyo; lo que no se pasa viene vacio. */
const datos = ({
  quote = cotizacion() as Quote | null,
  items = [] as QuoteItem[] | null,
  catalogos = [partsouq] as Catalog[] | null,
} = {}) =>
  mock.responde((consulta) => ({
    data: { quotes: quote, quote_items: items, catalogs: catalogos }[consulta.tabla],
    error: null,
  }))

const pagina = (id = ID) =>
  CotizacionPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) })

beforeEach(() => {
  jest.clearAllMocks()
  mock.limpiar()
  requireAuthenticatedProfile.mockResolvedValue({ id: "user-1" })
})

test("exige sesion, busca por id y lista las piezas sin el flete", async () => {
  datos()

  render(await pagina())

  expect(metadata.title).toBe("Detalle de cotizacion")
  expect(requireAuthenticatedProfile).toHaveBeenCalled()

  const [quotes, items] = mock.consultas as Consulta[]
  expect(quotes.tabla).toBe("quotes")
  expect(argumentos(quotes, "eq")).toEqual(["id", ID])
  expect(items.tabla).toBe("quote_items")
  expect(argumentos(items, "eq")).toEqual(["quote_id", ID])

  expect(screen.getByRole("heading", { name: "TOYOTA HILUX (2012)" })).toBeInTheDocument()
  expect(screen.getByText("SANCOR · CABRERA LEANDRO")).toBeInTheDocument()
  expect(screen.getByText("Godoy Cruz, Mendoza")).toBeInTheDocument()
  expect(screen.getByText("Revisar el frente completo")).toBeInTheDocument()

  // El VIN es el dato con el que se busca en los catalogos.
  expect(screen.getByText("8AJFZ22G8C5021495")).toBeInTheDocument()
  expect(screen.getByText("3.0 TD")).toBeInTheDocument()

  // El flete no es una pieza: quedan dos.
  expect(screen.getByText("0 de 2 piezas cotizadas")).toBeInTheDocument()
  expect(screen.getByText(/catalogo PartSouq/)).toBeInTheDocument()
  expect(screen.queryByText(/Total/)).toBeNull()
  expect(screen.queryByText("FLETE")).toBeNull()
  expect(screen.getByRole("cell", { name: "52119-0K021-00" })).toBeInTheDocument()
  // Una pieza sin codigo del fabricante se lista igual y se busca a mano.
  expect(screen.getByRole("cell", { name: /Rejilla del Paragolpes/ })).toBeInTheDocument()
  expect(screen.getAllByRole("cell", { name: "-" })).toHaveLength(1)
  const [conCodigo, sinCodigo] = screen.getAllByRole("link", { name: "Buscar" })
  expect(conCodigo).toHaveAttribute("href", "https://partsouq.com/en/search/all?q=521190K021")
  expect(sinCodigo).toHaveAttribute("href", "https://partsouq.com/es/")

  expect(screen.getByRole("button", { name: /Cotizaciones/ })).toHaveAttribute("href", "/")
})

test("una cotizacion que no existe es un 404", async () => {
  datos({ quote: null, items: null, catalogos: null })

  await expect(pagina("no-existe")).rejects.toThrow("NEXT_NOT_FOUND")
  expect(notFound).toHaveBeenCalled()
})

test("sin detalle explica que Orion todavia no mando las piezas", async () => {
  datos({
    quote: cotizacion({
      detail: null,
      anio: null,
      vin: null,
      patente: null,
      nro_siniestro: null,
      zona: null,
      provincia: null,
      compania: null,
      perito: null,
      fecha_pedido: null,
      fecha_vencimiento: null,
    }),
  })

  render(await pagina())

  expect(screen.getByText(/Orion todavia no devolvio las piezas/)).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "TOYOTA HILUX" })).toBeInTheDocument()
  // Los datos que Orion no mando no dejan etiquetas sueltas.
  expect(screen.queryByText("VIN")).toBeNull()
  expect(screen.queryByText("Zona")).toBeNull()
})

test("un detalle sin observaciones ni color no muestra esas secciones", async () => {
  datos({ quote: cotizacion({ detail: { listRepuestos: [pieza(223)] } }) })

  render(await pagina())

  expect(screen.queryByText("Observaciones del perito")).toBeNull()
  expect(screen.queryByText("Color")).toBeNull()
  expect(screen.getByText("0 de 1 piezas cotizadas")).toBeInTheDocument()
})

test("cuenta las piezas con precio, suma por moneda y busca con el numero guardado", async () => {
  datos({
    items: [
      item(),
      item({ orion_repuesto_id: 6740, part_number: null, price: 1000, currency: "ARS" }),
      // Un precio borrado no cuenta, y menos el de una linea que no se lista.
      item({ orion_repuesto_id: 9999990, price: null }),
    ],
  })

  render(await pagina())

  expect(screen.getByText("2 de 2 piezas cotizadas")).toBeInTheDocument()
  expect(screen.getByText("Total USD 175,59")).toBeInTheDocument()
  expect(screen.getByText("Total ARS 1.000,00")).toBeInTheDocument()
  expect(screen.getAllByRole("link", { name: "Buscar" })[0]).toHaveAttribute(
    "href",
    "https://partsouq.com/en/search/all?q=521190K021"
  )
})

test("una marca sin catalogo no ofrece buscar", async () => {
  datos({ quote: cotizacion({ vehiculo: "FORD RANGER" }), items: null, catalogos: null })

  render(await pagina())

  expect(screen.queryByText(/catalogo/)).toBeNull()
  expect(screen.queryByRole("link", { name: "Buscar" })).toBeNull()
})
