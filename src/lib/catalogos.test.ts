import type { Catalog } from "@/schemas/catalog"

import {
  catalogoDelVehiculo,
  codigoDeFabricante,
  enlaceDeBusqueda,
} from "./catalogos"

const catalogo = (override: Partial<Catalog> = {}): Catalog => ({
  id: "c1",
  slug: "partsouq",
  name: "PartSouq",
  url: "https://partsouq.com/es/",
  brands: ["toyota"],
  is_active: true,
  requires_auth: false,
  notes: null,
  created_at: "2026-09-25T00:00:00+00:00",
  updated_at: "2026-09-25T00:00:00+00:00",
  ...override,
})

test("elige el primer catalogo activo de la marca del vehiculo", () => {
  const pausado = catalogo({ id: "pausado", is_active: false })
  const servicebox = catalogo({ id: "sb", slug: "servicebox", brands: ["peugeot", "citroen"] })
  const partsouq = catalogo()
  const lista = [pausado, servicebox, partsouq]

  expect(catalogoDelVehiculo(lista, "TOYOTA HILUX")).toBe(partsouq)
  expect(catalogoDelVehiculo(lista, "CITROËN C 4")).toBe(servicebox)
  expect(catalogoDelVehiculo(lista, "FORD RANGER")).toBeNull()
  expect(catalogoDelVehiculo(lista, null)).toBeNull()
  expect(catalogoDelVehiculo(lista, "")).toBeNull()
})

test("normaliza el codigo como lo indexan los catalogos", () => {
  expect(codigoDeFabricante("52119-0U902")).toBe("521190U902")
  // Toyota: los dos ultimos caracteres son el color, no el numero de parte.
  expect(codigoDeFabricante("52119-0K021-00")).toBe("521190K021")
  expect(codigoDeFabricante("73970-0K020-B0")).toBe("739700K020")
  expect(codigoDeFabricante("16096472xt")).toBe("16096472XT")
  expect(codigoDeFabricante("81135")).toBe("81135")
})

test("los codigos internos de Orion y los vacios no son de fabricante", () => {
  expect(codigoDeFabricante("SCOD306434180")).toBeNull()
  expect(codigoDeFabricante("PSCOD4514DS412/674")).toBeNull()
  expect(codigoDeFabricante("")).toBeNull()
  expect(codigoDeFabricante(null)).toBeNull()
  expect(codigoDeFabricante(undefined)).toBeNull()
})

test("PartSouq busca por codigo; el resto abre el catalogo", () => {
  expect(enlaceDeBusqueda(catalogo(), "521190K021")).toBe(
    "https://partsouq.com/en/search/all?q=521190K021"
  )
  expect(enlaceDeBusqueda(catalogo(), null)).toBe("https://partsouq.com/es/")
  expect(
    enlaceDeBusqueda(
      catalogo({ slug: "servicebox", url: "https://public.servicebox.peugeot.com/" }),
      "1609645880"
    )
  ).toBe("https://public.servicebox.peugeot.com/")
})
