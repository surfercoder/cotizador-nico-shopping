const updateUserAccess = jest.fn()
jest.mock("./actions", () => ({
  updateUserAccess: (...args: unknown[]) => updateUserAccess(...args),
}))

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { Profile } from "@/schemas/profile"

import { UserRowForm } from "./user-row-form"

const usuario = (override: Partial<Profile> = {}): Profile => ({
  id: "99999999-9999-4999-8999-999999999999",
  email: "nico@shopping.com",
  full_name: "Nico Shopping",
  role: "operador",
  is_active: false,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
  ...override,
})

const fila = (props: { user?: Profile; isSelf?: boolean } = {}) =>
  render(
    <table>
      <tbody>
        <UserRowForm user={props.user ?? usuario()} isSelf={props.isSelf ?? false} />
      </tbody>
    </table>
  )

beforeEach(() => {
  jest.clearAllMocks()
  updateUserAccess.mockResolvedValue({})
})

test("muestra el usuario con su rol y estado actual", () => {
  fila({ user: usuario({ role: "supervisor", is_active: true }) })

  expect(screen.getByText("Nico Shopping")).toBeInTheDocument()
  expect(screen.getByText("nico@shopping.com")).toBeInTheDocument()
  expect(screen.getByLabelText("Rol")).toHaveValue("supervisor")
  expect(screen.getByRole("checkbox")).toBeChecked()
})

test("sin nombre cargado muestra un guion", () => {
  fila({ user: usuario({ full_name: "" }) })

  expect(screen.getByText("—")).toBeInTheDocument()
})

test("manda el id, el rol elegido y el checkbox", async () => {
  fila()

  await userEvent.selectOptions(screen.getByLabelText("Rol"), "admin")
  await userEvent.click(screen.getByRole("checkbox"))
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))

  expect(Object.fromEntries(updateUserAccess.mock.calls[0][1] as FormData)).toEqual({
    userId: "99999999-9999-4999-8999-999999999999",
    role: "admin",
    isActive: "on",
  })
})

test("el propio admin no puede editarse la fila", () => {
  fila({ isSelf: true })

  expect(screen.getByLabelText("Rol")).toBeDisabled()
  expect(screen.getByRole("checkbox")).toBeDisabled()
  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled()
})

test("el resultado de la action se muestra en la fila", async () => {
  updateUserAccess.mockResolvedValue({ ok: true, message: "Usuario actualizado." })
  const { rerender } = fila()

  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
  const exito = await screen.findByText("Usuario actualizado.")
  expect(exito).toHaveClass("text-muted-foreground")

  // Y un error se pinta distinto.
  updateUserAccess.mockResolvedValue({ ok: false, message: "No pudimos actualizar." })
  rerender(
    <table>
      <tbody>
        <UserRowForm user={usuario()} isSelf={false} />
      </tbody>
    </table>
  )
  await userEvent.click(screen.getByRole("button", { name: "Guardar" }))
  expect(await screen.findByText("No pudimos actualizar.")).toHaveClass(
    "text-destructive"
  )
})
