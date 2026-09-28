import { render, screen } from "@testing-library/react"

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "./table"

test("la tabla arma encabezado, cuerpo, footer y caption", () => {
  render(
    <Table className="min-w-lg">
      <TableCaption>Cotizaciones de hoy</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Patente</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>AF-232-AO</TableCell>
        </TableRow>
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>1 fila</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  )

  const tabla = screen.getByRole("table")
  expect(tabla).toHaveClass("min-w-lg")
  expect(tabla.parentElement).toHaveAttribute("data-slot", "table-container")
  expect(screen.getByText("Cotizaciones de hoy")).toHaveAttribute(
    "data-slot",
    "table-caption"
  )
  expect(screen.getByRole("columnheader", { name: "Patente" })).toHaveAttribute(
    "data-slot",
    "table-head"
  )
  expect(screen.getByRole("cell", { name: "AF-232-AO" })).toHaveAttribute(
    "data-slot",
    "table-cell"
  )
  expect(screen.getByText("1 fila").closest("tfoot")).toHaveAttribute(
    "data-slot",
    "table-footer"
  )
})
