import { render, screen } from "@testing-library/react"

import ForbiddenPage, { metadata } from "./page"

test("explica que el rol no alcanza y deja volver al panel", () => {
  render(<ForbiddenPage />)

  expect(metadata.title).toBe("Sin permisos")
  expect(screen.getByText("No tenes permisos")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Volver al panel" })).toHaveAttribute(
    "href",
    "/"
  )
})
