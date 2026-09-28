import { render, screen } from "@testing-library/react"

import UpdatePasswordPage, { metadata } from "./page"

test("la pagina de nueva contrasena muestra el formulario", () => {
  render(<UpdatePasswordPage />)

  expect(metadata.title).toBe("Nueva contrasena")
  expect(screen.getByLabelText("Nueva contrasena")).toBeInTheDocument()
  expect(screen.getByLabelText("Repetir contrasena")).toBeInTheDocument()
})
