/**
 * @jest-environment node
 */
import {
  BRAND_SUGGESTIONS,
  catalogCredentialsSchema,
  createCatalogSchema,
  deleteCatalogSchema,
  formatBrand,
  normalizeBrand,
  updateCatalogFormSchema,
} from "./catalog"

const ID = "11111111-1111-4111-8111-111111111111"

const errores = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? []

test("las sugerencias del datalist ya vienen normalizadas", () => {
  expect(BRAND_SUGGESTIONS.map(normalizeBrand)).toEqual([...BRAND_SUGGESTIONS])
})

test("las marcas se normalizan sin acentos ni mayusculas", () => {
  expect(normalizeBrand(" Citroën ")).toBe("citroen")
  expect(formatBrand("citroen")).toBe("Citroen")
})

test("el alta parsea la lista de marcas y deduplica", () => {
  const catalogo = createCatalogSchema.parse({
    name: " Repuestos Sur ",
    slug: " Repuestos-SUR ",
    url: "https://repuestos.com",
    brands: "Ford, ford , CITROËN, ,",
    requiresAuth: "on",
    notes: "  ",
  })

  expect(catalogo).toEqual({
    name: "Repuestos Sur",
    slug: "repuestos-sur",
    url: "https://repuestos.com",
    brands: ["ford", "citroen"],
    requiresAuth: true,
    notes: null,
  })
})

test("sin marcas ni checkbox el catalogo queda multimarca y sin auth", () => {
  const catalogo = createCatalogSchema.parse({
    name: "Generico",
    slug: "generico",
    url: "https://generico.com",
  })

  expect(catalogo.brands).toEqual([])
  expect(catalogo.requiresAuth).toBe(false)
  expect(catalogo.notes).toBeNull()
})

test("las notas se recortan y se validan por largo", () => {
  expect(
    createCatalogSchema.parse({
      name: "Generico",
      slug: "generico",
      url: "https://generico.com",
      notes: "  vende solo mayoristas  ",
    }).notes
  ).toBe("vende solo mayoristas")

  expect(
    errores(
      createCatalogSchema.safeParse({
        name: "Generico",
        slug: "generico",
        url: "https://generico.com",
        notes: "x".repeat(301),
      })
    )
  ).toContain("Maximo 300 caracteres.")
})

test("el alta rechaza nombre, slug y url invalidos", () => {
  const mensajes = errores(
    createCatalogSchema.safeParse({ name: "R", slug: "Con Espacios", url: "no-url" })
  )

  expect(mensajes).toEqual(
    expect.arrayContaining([
      "Ingresa el nombre del catalogo.",
      "Solo minusculas, numeros y guiones.",
      "Ingresa la URL completa del catalogo.",
    ])
  )
  expect(
    errores(
      createCatalogSchema.safeParse({
        name: "N".repeat(61),
        slug: "s".repeat(31),
        url: "https://x.com",
      })
    )
  ).toEqual(
    expect.arrayContaining(["Maximo 60 caracteres.", "Maximo 30 caracteres."])
  )
  expect(
    errores(createCatalogSchema.safeParse({ name: "Ok", slug: "s", url: "https://x.com" }))
  ).toContain("Ingresa un identificador.")
})

test("la edicion no toca el slug y resuelve los dos checkboxes", () => {
  expect(
    updateCatalogFormSchema.parse({
      catalogId: ID,
      name: "Repuestos Sur",
      url: "https://repuestos.com",
      isActive: "on",
    })
  ).toEqual({
    catalogId: ID,
    name: "Repuestos Sur",
    url: "https://repuestos.com",
    brands: [],
    requiresAuth: false,
    isActive: true,
    notes: null,
  })
})

test("borrar y guardar credenciales exigen un id valido", () => {
  expect(deleteCatalogSchema.safeParse({ catalogId: "1" }).success).toBe(false)
  expect(deleteCatalogSchema.parse({ catalogId: ID })).toEqual({ catalogId: ID })

  expect(
    catalogCredentialsSchema.parse({
      catalogId: ID,
      username: "  nico  ",
      password: "secreta",
    })
  ).toEqual({ catalogId: ID, username: "nico", password: "secreta" })

  expect(
    errores(
      catalogCredentialsSchema.safeParse({ catalogId: ID, username: "", password: "" })
    )
  ).toEqual(
    expect.arrayContaining([
      "Ingresa el usuario del catalogo.",
      "Ingresa la contrasena.",
    ])
  )
  expect(
    errores(
      catalogCredentialsSchema.safeParse({
        catalogId: ID,
        username: "u".repeat(121),
        password: "p".repeat(201),
      })
    )
  ).toEqual(
    expect.arrayContaining(["Maximo 120 caracteres.", "Maximo 200 caracteres."])
  )
})
