import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { Input } from "./input"

test("escribe, respeta el tipo y marca el error de validacion", async () => {
  render(<Input type="email" aria-label="Email" aria-invalid className="w-10" />)

  const input = screen.getByLabelText("Email")
  await userEvent.type(input, "nico@shopping.com")

  expect(input).toHaveValue("nico@shopping.com")
  expect(input).toHaveAttribute("type", "email")
  expect(input).toHaveAttribute("data-slot", "input")
  expect(input).toHaveClass("w-10")
})
