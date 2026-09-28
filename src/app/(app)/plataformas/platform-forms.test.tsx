const createPlatform = jest.fn()
const updatePlatform = jest.fn()
const deletePlatform = jest.fn()
const savePlatformCredentials = jest.fn()
const syncPlatformNow = jest.fn()
jest.mock("./actions", () => ({
  createPlatform: (...args: unknown[]) => createPlatform(...args),
  updatePlatform: (...args: unknown[]) => updatePlatform(...args),
  deletePlatform: (...args: unknown[]) => deletePlatform(...args),
  savePlatformCredentials: (...args: unknown[]) => savePlatformCredentials(...args),
  syncPlatformNow: (...args: unknown[]) => syncPlatformNow(...args),
}))

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Platform, PlatformCredentialStatus } from "@/schemas/platform"

import { NewPlatformForm, PlatformCard } from "./platform-forms"

const ID = "88888888-8888-4888-8888-888888888888"

const plataforma = (override: Partial<Platform> = {}): Platform => ({
  id: ID,
  slug: "orion",
  name: "Sistema Orion",
  login_url: "https://orion.com/login",
  is_active: true,
  last_sync_at: null,
  last_sync_error: null,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

const credencial: PlatformCredentialStatus = {
  platform_id: ID,
  username: "27123456789",
  updated_at: "2026-09-20T12:00:00+00:00",
}

/** La tarjeta arma cuatro formularios; se distinguen por su orden. */
const formularios = () => {
  const [detalles, borrar, credenciales, sync] = Array.from(
    document.querySelectorAll("form")
  )
  return { detalles, borrar, credenciales, sync }
}

const badge = (texto: string) =>
  screen.getByText(texto, { selector: "[data-slot=badge]" })

const tarjeta = (override: Partial<Platform> = {}, credential = null as PlatformCredentialStatus | null) =>
  render(<PlatformCard platform={plataforma(override)} credential={credential} />)

beforeEach(() => {
  jest.clearAllMocks()
  for (const action of [
    createPlatform,
    updatePlatform,
    deletePlatform,
    savePlatformCredentials,
    syncPlatformNow,
  ]) {
    action.mockResolvedValue({})
  }
  jest.spyOn(window, "confirm").mockReturnValue(true)
})

test("el alta manda nombre, identificador y url", async () => {
  render(<NewPlatformForm />)

  await userEvent.type(screen.getByLabelText("Nombre"), "Sistema Orion")
  await userEvent.type(screen.getByLabelText("Identificador"), "orion")
  await userEvent.type(
    screen.getByLabelText("URL de login"),
    "https://orion.com/login"
  )
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }))

  expect(Object.fromEntries(createPlatform.mock.calls[0][1] as FormData)).toEqual({
    name: "Sistema Orion",
    slug: "orion",
    login_url: "https://orion.com/login",
  })
})

test("el alta marca los campos que volvieron con error", async () => {
  createPlatform.mockResolvedValue({
    ok: false,
    message: "Ya existe una plataforma con ese identificador.",
    fieldErrors: {
      name: ["Ingresa el nombre de la plataforma."],
      slug: ["Solo minusculas, numeros y guiones."],
      login_url: ["Ingresa la URL de login completa."],
    },
  })
  render(<NewPlatformForm />)

  await userEvent.type(screen.getByLabelText("Nombre"), "O")
  await userEvent.type(screen.getByLabelText("Identificador"), "o")
  await userEvent.type(screen.getByLabelText("URL de login"), "https://x.com")
  await userEvent.click(screen.getByRole("button", { name: "Agregar" }))

  expect(
    await screen.findByText("Ya existe una plataforma con ese identificador.")
  ).toBeInTheDocument()
  for (const campo of ["Nombre", "Identificador", "URL de login"]) {
    expect(screen.getByLabelText(campo)).toHaveAttribute("aria-invalid", "true")
  }
})

test("la tarjeta resume estado y credenciales", () => {
  const { unmount } = tarjeta()

  expect(screen.getByText("Sistema Orion")).toBeInTheDocument()
  expect(screen.getByText("orion")).toBeInTheDocument()
  expect(badge("Activa")).toBeInTheDocument()
  expect(badge("Sin credenciales")).toBeInTheDocument()
  expect(screen.getByText("Todavia no se sincronizo nunca.")).toBeInTheDocument()
  expect(
    within(formularios().credenciales).getByRole("button", { name: "Guardar" })
  ).toBeInTheDocument()
  unmount()

  tarjeta(
    {
      is_active: false,
      last_sync_at: "2026-09-27T10:00:00+00:00",
      last_sync_error: "Orion respondio 500",
    },
    credencial
  )

  expect(badge("Pausada")).toBeInTheDocument()
  expect(badge("Con credenciales")).toBeInTheDocument()
  expect(screen.getByText(/Ultima sincronizacion:/)).toBeInTheDocument()
  expect(screen.getByText(/Ultimo error: Orion respondio 500/)).toBeInTheDocument()
  expect(screen.getByLabelText("Usuario de la plataforma")).toHaveValue("27123456789")
  expect(screen.getByText(/Ultima actualizacion:/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Reemplazar" })).toBeInTheDocument()
})

test("editar manda el id con los campos y el checkbox", async () => {
  tarjeta()

  await userEvent.click(
    within(formularios().detalles).getByRole("button", { name: "Guardar" })
  )

  expect(Object.fromEntries(updatePlatform.mock.calls[0][1] as FormData)).toEqual({
    platformId: ID,
    name: "Sistema Orion",
    login_url: "https://orion.com/login",
    isActive: "on",
  })
})

test("editar muestra los errores de nombre y url", async () => {
  updatePlatform.mockResolvedValue({
    ok: false,
    message: "No pudimos actualizar la plataforma.",
    fieldErrors: {
      name: ["Ingresa el nombre de la plataforma."],
      login_url: ["Ingresa la URL de login completa."],
    },
  })
  tarjeta()

  await userEvent.click(
    within(formularios().detalles).getByRole("button", { name: "Guardar" })
  )

  expect(
    await screen.findByText("No pudimos actualizar la plataforma.")
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true")
  expect(screen.getByLabelText("URL de login")).toHaveAttribute("aria-invalid", "true")
})

test("eliminar pide confirmacion y respeta el no", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(false)
  tarjeta()

  await userEvent.click(screen.getByRole("button", { name: "Eliminar" }))

  expect(window.confirm).toHaveBeenCalledWith(
    'Eliminar "Sistema Orion"? Tambien se borran sus credenciales.'
  )
  expect(deletePlatform).not.toHaveBeenCalled()
})

test("eliminar confirmado manda el id y muestra el error si falla", async () => {
  deletePlatform.mockResolvedValue({
    ok: false,
    message: "No pudimos eliminar la plataforma.",
  })
  tarjeta()

  await userEvent.click(screen.getByRole("button", { name: "Eliminar" }))

  expect(Object.fromEntries(deletePlatform.mock.calls[0][1] as FormData)).toEqual({
    platformId: ID,
  })
  expect(
    await screen.findByText("No pudimos eliminar la plataforma.")
  ).toBeInTheDocument()
})

test("las credenciales viajan con el id de la plataforma", async () => {
  tarjeta()

  await userEvent.type(screen.getByLabelText("Usuario de la plataforma"), "27123456789")
  await userEvent.type(screen.getByLabelText("Contrasena"), "clave")
  await userEvent.click(
    within(formularios().credenciales).getByRole("button", { name: "Guardar" })
  )

  expect(
    Object.fromEntries(savePlatformCredentials.mock.calls[0][1] as FormData)
  ).toEqual({ platformId: ID, username: "27123456789", password: "clave" })
})

test("las credenciales muestran los errores por campo", async () => {
  savePlatformCredentials.mockResolvedValue({
    ok: false,
    fieldErrors: {
      username: ["Ingresa el usuario de la plataforma."],
      password: ["Ingresa la contrasena."],
    },
  })
  tarjeta()

  await userEvent.type(screen.getByLabelText("Usuario de la plataforma"), "x")
  await userEvent.type(screen.getByLabelText("Contrasena"), "y")
  await userEvent.click(
    within(formularios().credenciales).getByRole("button", { name: "Guardar" })
  )

  expect(
    await screen.findByText("Ingresa el usuario de la plataforma.")
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Contrasena")).toHaveAttribute("aria-invalid", "true")
})

test("sincronizar ahora manda el id y muestra el resultado", async () => {
  syncPlatformNow.mockResolvedValue({
    ok: true,
    message: "Listo: 3 cotizaciones sincronizadas.",
  })
  tarjeta()

  await userEvent.click(screen.getByRole("button", { name: "Sincronizar ahora" }))

  expect(Object.fromEntries(syncPlatformNow.mock.calls[0][1] as FormData)).toEqual({
    platformId: ID,
  })
  expect(
    await screen.findByText("Listo: 3 cotizaciones sincronizadas.")
  ).toBeInTheDocument()
})

test("un guardado exitoso no tapa un error al eliminar", async () => {
  updatePlatform.mockResolvedValue({ ok: true, message: "Plataforma actualizada." })
  deletePlatform.mockResolvedValue({
    ok: false,
    message: "No pudimos eliminar la plataforma.",
  })
  tarjeta()

  await userEvent.click(
    within(formularios().detalles).getByRole("button", { name: "Guardar" })
  )
  expect(await screen.findByText("Plataforma actualizada.")).toBeInTheDocument()

  await userEvent.click(screen.getByRole("button", { name: "Eliminar" }))

  expect(
    await screen.findByText("No pudimos eliminar la plataforma.")
  ).toBeInTheDocument()
})
