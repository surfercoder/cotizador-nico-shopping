import { render, screen } from "@testing-library/react"

import LoginPage, { metadata } from "./page"

test("la pagina de login muestra el formulario y el link a registro", async () => {
  render(await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) }))

  expect(metadata.title).toBe("Ingresar")
  expect(screen.getByText("Ingresar", { selector: "[data-slot=card-title]" })).toBeInTheDocument()
  expect(screen.getByLabelText("Email")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Crear una" })).toHaveAttribute(
    "href",
    "/registro"
  )
})

test("el next del querystring viaja al formulario solo si es un string", async () => {
  const { unmount } = render(
    await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ next: "/catalogos" }) })
  )

  expect(document.querySelector("input[name=next]")).toHaveValue("/catalogos")
  unmount()

  // Repetido (?next=a&next=b) llega como array y se descarta.
  render(await LoginPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ next: ["/a", "/b"] }) }))
  expect(document.querySelector("input[name=next]")).toBeNull()
})
