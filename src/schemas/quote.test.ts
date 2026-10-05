import { detalleDeCotizacion, guardarPrecioSchema } from "./quote"

const pieza = (idPieza: number, override = {}) => ({
  id: idPieza * 10,
  idPieza,
  descripcion: "Paragolpes Del.",
  codRepuesto: "52119-0K021-00",
  // Orion manda muchos campos mas que no tipamos: no tienen que molestar.
  precioLegitimo: 0,
  __type: "OrionRepuestos.Entities.CotizacionRepuestoExtended",
  ...override,
})

test("lee lo que se muestra y deja afuera la linea de flete", () => {
  const detalle = detalleDeCotizacion({
    vin: "8AJFZ22G8C5021495",
    tipoMotor: "3.0 TD",
    color: { descripcion: "Blanco" },
    observPerito: "Revisar frente",
    listRepuestos: [
      pieza(223),
      pieza(999999, { descripcion: "FLETE", codRepuesto: null }),
      pieza(228, { descripcion: "Optica Der." }),
    ],
  })

  expect(detalle?.tipoMotor).toBe("3.0 TD")
  expect(detalle?.color?.descripcion).toBe("Blanco")
  expect(detalle?.observPerito).toBe("Revisar frente")
  expect(detalle?.piezas.map((p) => p.idPieza)).toEqual([223, 228])
})

test("una cotizacion sin detalle o sin piezas no rompe", () => {
  expect(detalleDeCotizacion(null)).toBeNull()
  expect(detalleDeCotizacion({ listRepuestos: null })?.piezas).toEqual([])
  expect(detalleDeCotizacion({})?.piezas).toEqual([])
})

test("un detalle con otra forma devuelve null en vez de romper", () => {
  expect(detalleDeCotizacion("no es un objeto")).toBeNull()
  expect(detalleDeCotizacion({ listRepuestos: [{ id: "no es numero" }] })).toBeNull()
})

describe("guardarPrecioSchema", () => {
  const valido = {
    quoteId: "11111111-1111-4111-8111-111111111111",
    repuestoId: "2230",
    partNumber: " 521190K021 ",
    price: "175,59",
    currency: "USD",
    catalogId: "22222222-2222-4222-8222-222222222222",
  }

  test("acepta coma decimal y limpia los textos", () => {
    expect(guardarPrecioSchema.parse(valido)).toEqual({
      ...valido,
      repuestoId: 2230,
      partNumber: "521190K021",
      price: 175.59,
    })
  })

  test("vacio borra el precio y el numero de parte, sin catalogo es null", () => {
    expect(
      guardarPrecioSchema.parse({ ...valido, price: " ", partNumber: "", catalogId: "" })
    ).toMatchObject({ price: null, partNumber: null, catalogId: null })
    expect(
      guardarPrecioSchema.parse({ ...valido, catalogId: undefined }).catalogId
    ).toBeNull()
  })

  test("la coma es el decimal y el punto de miles solo vale con coma", () => {
    const precio = (price: string) => guardarPrecioSchema.safeParse({ ...valido, price })

    expect(precio("1.234,56").data?.price).toBe(1234.56)
    expect(precio("1234.5").data?.price).toBe(1234.5)
    // "1.234" puede ser mil: se rechaza antes que guardar 1,234.
    expect(precio("1.234").error?.issues[0].message).toBe("Usa coma para los decimales: 1234,56.")
    expect(precio("12.345.678").success).toBe(false)
  })

  test("rechaza precios que no son numeros validos y monedas desconocidas", () => {
    expect(guardarPrecioSchema.safeParse({ ...valido, price: "abc" }).success).toBe(false)
    expect(guardarPrecioSchema.safeParse({ ...valido, price: "-1" }).success).toBe(false)
    expect(guardarPrecioSchema.safeParse({ ...valido, currency: "EUR" }).success).toBe(false)
    expect(guardarPrecioSchema.safeParse({ ...valido, quoteId: "x" }).success).toBe(false)
  })
})
