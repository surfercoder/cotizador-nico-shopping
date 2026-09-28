import { render, screen } from "@testing-library/react"

import { Button } from "./button"
import { buttonVariants } from "./button-variants"

test("el boton nativo toma la variante y el tamano por defecto", () => {
  render(<Button>Guardar</Button>)

  const boton = screen.getByRole("button", { name: "Guardar" })
  expect(boton.tagName).toBe("BUTTON")
  expect(boton).toHaveAttribute("data-slot", "button")
  expect(boton.className).toContain("bg-primary")
})

test("acepta variante, tamano y clases propias", () => {
  render(
    <Button variant="destructive" size="icon-sm" className="ml-2" disabled>
      X
    </Button>
  )

  const boton = screen.getByRole("button", { name: "X" })
  expect(boton).toBeDisabled()
  expect(boton).toHaveClass("ml-2")
  expect(boton.className).toContain("text-destructive")
})

test("buttonVariants se puede usar suelto para estilar otro elemento", () => {
  expect(buttonVariants({ variant: "link", size: "lg" })).toContain("underline-offset-4")
})
