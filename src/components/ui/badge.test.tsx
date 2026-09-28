import { render, screen } from "@testing-library/react"

import { Badge } from "./badge"
import { badgeVariants } from "./badge-variants"

test("el badge usa la variante por defecto y acepta clases propias", () => {
  render(<Badge className="ml-1">Activo</Badge>)

  const badge = screen.getByText("Activo")
  expect(badge.tagName).toBe("SPAN")
  expect(badge).toHaveClass("ml-1")
  expect(badge.className).toContain("bg-primary")
})

test("el badge puede renderizarse como otro elemento", () => {
  render(<Badge variant="outline" render={<a href="/estado" />}>Ver</Badge>)

  expect(screen.getByRole("link", { name: "Ver" })).toHaveAttribute("href", "/estado")
})

test("badgeVariants se puede usar suelto para estilar otro elemento", () => {
  expect(badgeVariants({ variant: "secondary" })).toContain("bg-secondary")
})
