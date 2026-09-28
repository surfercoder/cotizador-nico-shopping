import { render, screen } from "@testing-library/react"

import AuthErrorPage from "./page"

test("muestra el motivo que manda Supabase", async () => {
  render(
    await AuthErrorPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ motivo: "Link vencido" }) })
  )

  expect(screen.getByText("Link vencido")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Volver a ingresar" })).toHaveAttribute(
    "href",
    "/login"
  )
  expect(screen.getByRole("button", { name: "Pedir uno nuevo" })).toHaveAttribute(
    "href",
    "/recuperar"
  )
})

test("sin motivo usable muestra el texto generico", async () => {
  const { unmount } = render(
    await AuthErrorPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })
  )
  expect(screen.getByText("El link es invalido o ya vencio.")).toBeInTheDocument()
  unmount()

  // Vacio o repetido (llega como array) tampoco sirve.
  render(await AuthErrorPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ motivo: "" }) }))
  expect(screen.getByText("El link es invalido o ya vencio.")).toBeInTheDocument()
})
