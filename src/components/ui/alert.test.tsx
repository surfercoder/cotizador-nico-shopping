import { render, screen } from "@testing-library/react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert"

test("la alerta arma titulo, descripcion y accion", () => {
  render(
    <Alert className="mt-2">
      <AlertTitle>Sin credenciales</AlertTitle>
      <AlertDescription>Cargalas para poder sincronizar.</AlertDescription>
      <AlertAction>
        <button type="button">Cargar</button>
      </AlertAction>
    </Alert>
  )

  const alerta = screen.getByRole("alert")
  expect(alerta).toHaveClass("mt-2")
  expect(screen.getByText("Sin credenciales")).toHaveAttribute(
    "data-slot",
    "alert-title"
  )
  expect(screen.getByText("Cargalas para poder sincronizar.")).toHaveAttribute(
    "data-slot",
    "alert-description"
  )
  expect(screen.getByRole("button").parentElement).toHaveAttribute(
    "data-slot",
    "alert-action"
  )
})

test("la variante destructiva pinta distinto", () => {
  render(<Alert variant="destructive">Error</Alert>)

  expect(screen.getByRole("alert").className).toContain("text-destructive")
})
