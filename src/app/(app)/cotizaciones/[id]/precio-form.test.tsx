const guardarPrecio = jest.fn()
jest.mock("./actions", () => ({
  guardarPrecio: (...args: unknown[]) => guardarPrecio(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { QuoteItem } from "@/schemas/quote"

import { PrecioRow } from "./precio-form"

const QUOTE = "11111111-1111-4111-8111-111111111111"
const pieza = { id: 2230, idPieza: 223, descripcion: "Paragolpes Del.", codRepuesto: "52119-0K021-00" }

const item: QuoteItem = {
  quote_id: QUOTE,
  orion_repuesto_id: 2230,
  part_number: "521190K021",
  price: 175.59,
  currency: "USD",
  catalog_id: null,
  updated_at: "2026-10-05T00:00:00+00:00",
  updated_by: null,
}

const fila = (props: Partial<React.ComponentProps<typeof PrecioRow>> = {}) =>
  render(
    <table>
      <tbody>
        <PrecioRow
          quoteId={QUOTE}
          pieza={pieza}
          item={null}
          catalogId="c1"
          codigo="521190K021"
          enlace="https://partsouq.com/en/search/all?q=521190K021"
          {...props}
        />
      </tbody>
    </table>
  )

beforeEach(() => jest.clearAllMocks())

test("sin precio guardado propone el codigo de Orion y manda todo al guardar", async () => {
  guardarPrecio.mockResolvedValue({ ok: true, message: "Guardado." })
  fila()

  expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute(
    "href",
    "https://partsouq.com/en/search/all?q=521190K021"
  )
  expect(screen.getByLabelText("Numero de parte de Paragolpes Del.")).toHaveValue("521190K021")

  await userEvent.type(screen.getByLabelText("Precio de Paragolpes Del."), "175,59")
  await userEvent.selectOptions(screen.getByLabelText("Moneda de Paragolpes Del."), "ARS")
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

  const datos = guardarPrecio.mock.calls[0][1] as FormData
  expect(Object.fromEntries(datos)).toEqual({
    quoteId: QUOTE,
    repuestoId: "2230",
    catalogId: "c1",
    partNumber: "521190K021",
    price: "175,59",
    currency: "ARS",
  })
  expect(await screen.findByRole("button", { name: "Guardado" })).toBeInTheDocument()
})

test("muestra lo guardado y no ofrece buscar si no hay catalogo", () => {
  fila({ item: { ...item, part_number: "52119-0K022", currency: "ARS" }, enlace: null, catalogId: null, codigo: null })

  expect(screen.getByLabelText("Numero de parte de Paragolpes Del.")).toHaveValue("52119-0K022")
  expect(screen.getByLabelText("Precio de Paragolpes Del.")).toHaveValue("175.59")
  expect(screen.getByLabelText("Moneda de Paragolpes Del.")).toHaveValue("ARS")
  expect(screen.queryByRole("link", { name: "Buscar" })).toBeNull()
})

test("sin nada guardado ni codigo los campos arrancan vacios", () => {
  fila({ codigo: null })

  expect(screen.getByLabelText("Numero de parte de Paragolpes Del.")).toHaveValue("")
  expect(screen.getByLabelText("Precio de Paragolpes Del.")).toHaveValue("")
})

test("muestra el error del campo o el general", async () => {
  guardarPrecio.mockResolvedValueOnce({
    ok: false,
    message: "Revisa los datos ingresados.",
    fieldErrors: { price: ["Ingresa un numero."] },
  })
  fila()

  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
  expect(await screen.findByText("Ingresa un numero.")).toBeInTheDocument()

  guardarPrecio.mockResolvedValueOnce({
    ok: false,
    message: "Revisa los datos ingresados.",
    fieldErrors: { partNumber: ["Maximo 40 caracteres."] },
  })
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
  expect(await screen.findByText("Maximo 40 caracteres.")).toBeInTheDocument()

  guardarPrecio.mockResolvedValueOnce({ ok: false, message: "No pudimos guardar el precio." })
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
  expect(await screen.findByText("No pudimos guardar el precio.")).toBeInTheDocument()
})
