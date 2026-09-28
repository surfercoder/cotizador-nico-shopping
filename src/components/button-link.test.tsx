import { render, screen } from "@testing-library/react"

import { ButtonLink } from "./button-link"

test("navega como link pero se ve como boton", () => {
  render(
    <ButtonLink href="/catalogos" variant="outline">
      Catalogos
    </ButtonLink>
  )

  // Base UI le pone role="button" al ancla cuando el render no es un <button>.
  const boton = screen.getByRole("button", { name: "Catalogos" })
  expect(boton.tagName).toBe("A")
  expect(boton).toHaveAttribute("href", "/catalogos")
  expect(boton).toHaveAttribute("data-slot", "button")
})
