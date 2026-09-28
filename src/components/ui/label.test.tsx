import { render, screen } from "@testing-library/react"

import { Label } from "./label"

test("la etiqueta apunta al control y acepta clases propias", () => {
  render(
    <>
      <Label htmlFor="nombre" className="sr-only">
        Nombre
      </Label>
      <input id="nombre" />
    </>
  )

  const label = screen.getByText("Nombre")
  expect(label).toHaveAttribute("for", "nombre")
  expect(label).toHaveClass("sr-only")
  expect(label).toHaveAttribute("data-slot", "label")
})
