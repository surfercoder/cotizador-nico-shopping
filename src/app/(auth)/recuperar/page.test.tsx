import { render, screen } from "@testing-library/react"

import ForgotPasswordPage, { metadata } from "./page"

test("la pagina de recupero explica que llega por email", () => {
  render(<ForgotPasswordPage />)

  expect(metadata.title).toBe("Recuperar contrasena")
  expect(screen.getByLabelText("Email")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Volver a ingresar" })).toHaveAttribute(
    "href",
    "/login"
  )
})
