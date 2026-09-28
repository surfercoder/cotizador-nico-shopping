import { render, screen } from "@testing-library/react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

test("la tarjeta arma header, contenido y footer", () => {
  render(
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Plataformas</CardTitle>
        <CardDescription>De donde salen las cotizaciones.</CardDescription>
        <CardAction>
          <button type="button">Nueva</button>
        </CardAction>
      </CardHeader>
      <CardContent>Orion</CardContent>
      <CardFooter>1 activa</CardFooter>
    </Card>
  )

  const card = screen.getByText("Plataformas").closest("[data-slot=card]")
  expect(card).toHaveClass("w-full")
  expect(card).toHaveAttribute("data-size", "default")
  expect(screen.getByText("De donde salen las cotizaciones.")).toHaveAttribute(
    "data-slot",
    "card-description"
  )
  expect(screen.getByRole("button", { name: "Nueva" }).parentElement).toHaveAttribute(
    "data-slot",
    "card-action"
  )
  expect(screen.getByText("Orion")).toHaveAttribute("data-slot", "card-content")
  expect(screen.getByText("1 activa")).toHaveAttribute("data-slot", "card-footer")
})

test("el tamano chico queda marcado para el CSS", () => {
  render(<Card size="sm">Compacta</Card>)

  expect(screen.getByText("Compacta")).toHaveAttribute("data-size", "sm")
})
