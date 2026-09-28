import { render, screen } from "@testing-library/react"

import { Separator } from "./separator"

test("por defecto es horizontal y se puede poner vertical", () => {
  const { rerender } = render(<Separator />)

  const separador = screen.getByRole("separator")
  expect(separador).toHaveAttribute("data-slot", "separator")
  expect(separador).toHaveAttribute("data-orientation", "horizontal")

  rerender(<Separator orientation="vertical" className="mx-2" />)
  const vertical = screen.getByRole("separator")
  expect(vertical).toHaveAttribute("data-orientation", "vertical")
  expect(vertical).toHaveClass("mx-2")
})
