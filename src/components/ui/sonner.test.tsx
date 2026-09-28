const useTheme = jest.fn()
jest.mock("next-themes", () => ({ useTheme: () => useTheme() }))

import { act } from "react"
import { render, screen } from "@testing-library/react"
import { toast } from "sonner"

import { Toaster } from "./sonner"

test("usa el tema elegido por el usuario y muestra los avisos", async () => {
  useTheme.mockReturnValue({ theme: "dark" })

  render(<Toaster />)
  act(() => {
    toast.success("Catalogo creado.")
  })

  expect(await screen.findByText("Catalogo creado.")).toBeInTheDocument()
  expect(document.querySelector("[data-sonner-toast]")).toBeInTheDocument()
})

test("sin tema definido cae en el del sistema", () => {
  useTheme.mockReturnValue({})

  render(<Toaster />)

  expect(screen.getByLabelText(/Notifications/)).toBeInTheDocument()
})
