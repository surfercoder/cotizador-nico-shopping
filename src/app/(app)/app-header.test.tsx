import { render, screen } from "@testing-library/react"

import type { Profile } from "@/schemas/profile"

import { AppHeader } from "./app-header"

const perfil = (override: Partial<Profile> = {}): Profile => ({
  id: "user-1",
  email: "nico@shopping.com",
  full_name: "Nico Shopping",
  role: "operador",
  is_active: true,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

test("el operador ve solo las secciones que le corresponden", () => {
  render(<AppHeader profile={perfil()} />)

  expect(screen.getByRole("button", { name: "Cotizaciones" })).toHaveAttribute(
    "href",
    "/"
  )
  expect(screen.getByRole("button", { name: "Mi cuenta" })).toHaveAttribute(
    "href",
    "/cuenta"
  )
  expect(screen.queryByRole("button", { name: "Usuarios" })).toBeNull()
  expect(screen.getByText("Operador")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Salir" })).toHaveAttribute(
    "type",
    "submit"
  )
})

test("el admin ve la administracion completa", () => {
  render(<AppHeader profile={perfil({ role: "admin" })} />)

  for (const [nombre, href] of [
    ["Plataformas", "/plataformas"],
    ["Catalogos", "/catalogos"],
    ["Usuarios", "/usuarios"],
  ]) {
    expect(screen.getByRole("button", { name: nombre })).toHaveAttribute("href", href)
  }
  expect(screen.getByText("Administrador")).toBeInTheDocument()
})

test("las iniciales salen del nombre y caen al email si no alcanza", () => {
  const { rerender } = render(<AppHeader profile={perfil()} />)
  expect(screen.getByText("NS")).toBeInTheDocument()

  // Un nombre de tres palabras usa solo las dos primeras.
  rerender(<AppHeader profile={perfil({ full_name: "juan carlos perez" })} />)
  expect(screen.getByText("JC")).toBeInTheDocument()

  // Sin nombre cargado queda la inicial del email.
  rerender(<AppHeader profile={perfil({ full_name: "" })} />)
  expect(screen.getByText("N")).toBeInTheDocument()
})
