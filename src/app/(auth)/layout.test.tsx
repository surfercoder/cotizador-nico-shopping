import { render, screen } from "@testing-library/react"

import AuthLayout from "./layout"

test("el layout de auth muestra la marca alrededor del contenido", () => {
  render(<AuthLayout params={Promise.resolve({})}>{<p>Formulario</p>}</AuthLayout>)

  expect(screen.getByText("Cotizador Nico Shopping")).toBeInTheDocument()
  expect(screen.getByText("Sistema interno de licitaciones")).toBeInTheDocument()
  expect(screen.getByText("Formulario")).toBeInTheDocument()
})
