import { render, screen } from "@testing-library/react"

import SignupPage, { metadata } from "./page"

test("la pagina de registro avisa que hace falta habilitacion", () => {
  render(<SignupPage />)

  expect(metadata.title).toBe("Crear cuenta")
  expect(screen.getByText("Crear cuenta", { selector: "[data-slot=card-title]" })).toBeInTheDocument()
  expect(
    screen.getByText(
      "Un administrador tiene que habilitarte antes de que puedas operar."
    )
  ).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Ingresar" })).toHaveAttribute(
    "href",
    "/login"
  )
})
