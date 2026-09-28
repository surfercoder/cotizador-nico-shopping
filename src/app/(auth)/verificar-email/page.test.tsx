import { render, screen } from "@testing-library/react"

import VerifyEmailPage, { metadata } from "./page"

test("la pagina de verificacion manda a abrir el link del mail", () => {
  render(<VerifyEmailPage />)

  expect(metadata.title).toBe("Confirma tu email")
  expect(screen.getByText(/Abrilo desde este mismo navegador/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Volver a ingresar" })).toHaveAttribute(
    "href",
    "/login"
  )
})
