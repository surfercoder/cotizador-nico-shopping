import { render, screen } from "@testing-library/react"

import { FormMessage } from "./form-message"

test("sin mensaje no renderiza nada", () => {
  const { container } = render(<FormMessage state={{}} />)

  expect(container).toBeEmptyDOMElement()
})

test("el error se muestra como alerta destructiva y el ok como normal", () => {
  const { rerender } = render(<FormMessage state={{ ok: false, message: "Fallo" }} />)

  expect(screen.getByText("Fallo")).toBeInTheDocument()
  expect(screen.getByRole("alert")).toHaveAttribute("data-slot", "alert")
  expect(screen.getByRole("alert").className).toContain("destructive")

  rerender(<FormMessage state={{ ok: true, message: "Listo" }} />)
  expect(screen.getByRole("alert").className).not.toContain("destructive")
})
