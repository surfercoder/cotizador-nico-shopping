const useFormStatus = jest.fn()
jest.mock("react-dom", () => ({
  ...jest.requireActual("react-dom"),
  useFormStatus: () => useFormStatus(),
}))

import { render, screen } from "@testing-library/react"

import { SubmitButton } from "./submit-button"

test("manda el formulario cuando no hay nada en vuelo", () => {
  useFormStatus.mockReturnValue({ pending: false })

  render(<SubmitButton>Guardar</SubmitButton>)

  const boton = screen.getByRole("button", { name: "Guardar" })
  expect(boton).toHaveAttribute("type", "submit")
  expect(boton).toBeEnabled()
  expect(boton.querySelector(".animate-spin")).toBeNull()
})

test("mientras la action corre se bloquea y muestra el spinner", () => {
  useFormStatus.mockReturnValue({ pending: true })

  render(<SubmitButton>Guardar</SubmitButton>)

  expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled()
  expect(document.querySelector(".animate-spin")).toBeInTheDocument()
})
