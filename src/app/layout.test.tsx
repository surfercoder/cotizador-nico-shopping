import { render, screen } from "@testing-library/react"

import RootLayout, { metadata } from "./layout"

test("el layout raiz declara el idioma, el titulo y no indexarse", () => {
  // <html>/<body> dentro del contenedor de pruebas: React los renderiza igual.
  render(<RootLayout params={Promise.resolve({})}>{<p>Contenido</p>}</RootLayout>)

  expect(screen.getByText("Contenido")).toBeInTheDocument()
  expect(document.querySelector("html[lang=es]")).toBeInTheDocument()
  expect(metadata.robots).toEqual({ index: false, follow: false })
  expect(metadata.title).toMatchObject({ default: "Cotizador Nico Shopping" })
})
