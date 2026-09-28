const createCatalog = jest.fn()
const updateCatalog = jest.fn()
const deleteCatalog = jest.fn()
const saveCatalogCredentials = jest.fn()
jest.mock("./actions", () => ({
  createCatalog: (...args: unknown[]) => createCatalog(...args),
  updateCatalog: (...args: unknown[]) => updateCatalog(...args),
  deleteCatalog: (...args: unknown[]) => deleteCatalog(...args),
  saveCatalogCredentials: (...args: unknown[]) => saveCatalogCredentials(...args),
}))

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Catalog, CatalogCredentialStatus } from "@/schemas/catalog"

import { BrandSuggestions, CatalogCard, NewCatalogForm } from "./catalog-forms"

const ID = "77777777-7777-4777-8777-777777777777"

const catalogo = (override: Partial<Catalog> = {}): Catalog => ({
  id: ID,
  slug: "servicebox",
  name: "Service Box",
  url: "https://servicebox.com",
  brands: ["peugeot", "citroen"],
  requires_auth: false,
  is_active: true,
  notes: null,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

const credencial: CatalogCredentialStatus = {
  catalog_id: ID,
  username: "nico",
  updated_at: "2026-09-20T12:00:00+00:00",
}

const formularios = () => {
  const [detalles, borrar, credenciales] = Array.from(
    document.querySelectorAll("form")
  )
  return { detalles, borrar, credenciales }
}

const badge = (texto: string) =>
  screen.getByText(texto, { selector: "[data-slot=badge]" })

const tarjeta = (
  override: Partial<Catalog> = {},
  credential: CatalogCredentialStatus | null = null
) => render(<CatalogCard catalog={catalogo(override)} credential={credential} />)

beforeEach(() => {
  jest.clearAllMocks()
  for (const action of [
    createCatalog,
    updateCatalog,
    deleteCatalog,
    saveCatalogCredentials,
  ]) {
    action.mockResolvedValue({})
  }
  jest.spyOn(window, "confirm").mockReturnValue(true)
})

test("el alta manda todos los campos, con las marcas como texto", async () => {
  render(<NewCatalogForm />)

  await userEvent.type(screen.getByLabelText("Nombre"), "Service Box")
  await userEvent.type(screen.getByLabelText("Identificador"), "servicebox")
  await userEvent.type(screen.getByLabelText("URL"), "https://servicebox.com")
  await userEvent.type(screen.getByLabelText("Marcas que cubre"), "peugeot, citroen")
  await userEvent.type(screen.getByLabelText("Notas"), "solo con usuario")
  await userEvent.click(screen.getByLabelText("Necesita usuario y clave"))
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }))

  expect(Object.fromEntries(createCatalog.mock.calls[0][1] as FormData)).toEqual({
    name: "Service Box",
    slug: "servicebox",
    url: "https://servicebox.com",
    brands: "peugeot, citroen",
    notes: "solo con usuario",
    requiresAuth: "on",
  })
})

test("el alta marca los campos que volvieron con error", async () => {
  createCatalog.mockResolvedValue({
    ok: false,
    message: "Ya existe un catalogo con ese identificador.",
    fieldErrors: {
      name: ["Ingresa el nombre del catalogo."],
      slug: ["Solo minusculas, numeros y guiones."],
      url: ["Ingresa la URL completa del catalogo."],
      notes: ["Maximo 300 caracteres."],
    },
  })
  render(<NewCatalogForm />)

  await userEvent.type(screen.getByLabelText("Nombre"), "S")
  await userEvent.type(screen.getByLabelText("Identificador"), "s")
  await userEvent.type(screen.getByLabelText("URL"), "https://x.com")
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }))

  expect(
    await screen.findByText("Ya existe un catalogo con ese identificador.")
  ).toBeInTheDocument()
  expect(screen.getByText("Maximo 300 caracteres.")).toBeInTheDocument()
  for (const campo of ["Nombre", "Identificador", "URL"]) {
    expect(screen.getByLabelText(campo)).toHaveAttribute("aria-invalid", "true")
  }
})

test("la tarjeta lista las marcas y esconde las credenciales si no las necesita", () => {
  tarjeta()

  expect(screen.getByRole("link", { name: "https://servicebox.com" })).toHaveAttribute(
    "target",
    "_blank"
  )
  expect(badge("Activo")).toBeInTheDocument()
  expect(badge("Peugeot")).toBeInTheDocument()
  expect(badge("Citroen")).toBeInTheDocument()
  expect(screen.queryByLabelText("Usuario del catalogo")).toBeNull()
})

test("un catalogo multimarca, pausado y con credenciales se muestra distinto", () => {
  const { unmount } = tarjeta({
    brands: [],
    is_active: false,
    requires_auth: true,
    notes: "mayoristas",
  })

  expect(badge("Pausado")).toBeInTheDocument()
  expect(badge("Multimarca")).toBeInTheDocument()
  expect(badge("Sin credenciales")).toBeInTheDocument()
  expect(screen.getByLabelText("Notas")).toHaveValue("mayoristas")
  unmount()

  tarjeta({ requires_auth: true }, credencial)
  expect(badge("Con credenciales")).toBeInTheDocument()
  expect(screen.getByLabelText("Usuario del catalogo")).toHaveValue("nico")
  expect(screen.getByText(/Ultima actualizacion:/)).toBeInTheDocument()
  expect(
    within(formularios().credenciales).getByRole("button", { name: "Reemplazar" })
  ).toBeInTheDocument()
})

test("editar manda el id, los campos y los dos checkboxes", async () => {
  tarjeta()

  await userEvent.click(
    within(formularios().detalles).getByRole("button", { name: "Guardar" })
  )

  expect(Object.fromEntries(updateCatalog.mock.calls[0][1] as FormData)).toEqual({
    catalogId: ID,
    name: "Service Box",
    url: "https://servicebox.com",
    brands: "peugeot, citroen",
    notes: "",
    isActive: "on",
  })
})

test("editar muestra los errores de nombre, url y notas", async () => {
  updateCatalog.mockResolvedValue({
    ok: false,
    message: "No pudimos actualizar el catalogo.",
    fieldErrors: {
      name: ["Ingresa el nombre del catalogo."],
      url: ["Ingresa la URL completa del catalogo."],
      notes: ["Maximo 300 caracteres."],
    },
  })
  tarjeta()

  await userEvent.click(
    within(formularios().detalles).getByRole("button", { name: "Guardar" })
  )

  expect(
    await screen.findByText("No pudimos actualizar el catalogo.")
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByLabelText("URL")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByText("Maximo 300 caracteres.")).toBeInTheDocument()
})

test("eliminar pide confirmacion y respeta el no", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(false)
  tarjeta()

  await userEvent.click(screen.getByRole("button", { name: "Eliminar" }))

  expect(window.confirm).toHaveBeenCalledWith(
    'Eliminar "Service Box"? Tambien se borran sus credenciales.'
  )
  expect(deleteCatalog).not.toHaveBeenCalled()
})

test("eliminar confirmado manda el id y muestra el error si falla", async () => {
  deleteCatalog.mockResolvedValue({
    ok: false,
    message: "No pudimos eliminar el catalogo.",
  })
  tarjeta()

  await userEvent.click(screen.getByRole("button", { name: "Eliminar" }))

  expect(Object.fromEntries(deleteCatalog.mock.calls[0][1] as FormData)).toEqual({
    catalogId: ID,
  })
  expect(
    await screen.findByText("No pudimos eliminar el catalogo.")
  ).toBeInTheDocument()
})

test("las credenciales del catalogo viajan con su id", async () => {
  tarjeta({ requires_auth: true })

  await userEvent.type(screen.getByLabelText("Usuario del catalogo"), "nico")
  await userEvent.type(screen.getByLabelText("Contrasena"), "clave")
  await userEvent.click(
    within(formularios().credenciales).getByRole("button", { name: "Guardar" })
  )

  expect(
    Object.fromEntries(saveCatalogCredentials.mock.calls[0][1] as FormData)
  ).toEqual({ catalogId: ID, username: "nico", password: "clave" })
})

test("las credenciales del catalogo muestran los errores por campo", async () => {
  saveCatalogCredentials.mockResolvedValue({
    ok: false,
    fieldErrors: {
      username: ["Ingresa el usuario del catalogo."],
      password: ["Ingresa la contrasena."],
    },
  })
  tarjeta({ requires_auth: true })

  await userEvent.type(screen.getByLabelText("Usuario del catalogo"), "x")
  await userEvent.type(screen.getByLabelText("Contrasena"), "y")
  await userEvent.click(
    within(formularios().credenciales).getByRole("button", { name: "Guardar" })
  )

  expect(
    await screen.findByText("Ingresa el usuario del catalogo.")
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Contrasena")).toHaveAttribute("aria-invalid", "true")
})

test("las sugerencias de marcas salen en un datalist compartido", () => {
  render(<BrandSuggestions brands={["ford", "peugeot"]} />)

  const opciones = Array.from(
    document.querySelectorAll("#brand-suggestions option")
  ).map((option) => option.getAttribute("value"))
  expect(opciones).toEqual(["ford", "peugeot"])
})
