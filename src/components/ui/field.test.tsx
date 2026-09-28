import { render, screen } from "@testing-library/react"

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "./field"

test("un fieldset completo arma leyenda, campos y descripcion", () => {
  render(
    <FieldSet className="gap-2">
      <FieldLegend>Credenciales</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="usuario">Usuario</FieldLabel>
          <input id="usuario" />
          <FieldDescription>El mismo del portal.</FieldDescription>
        </Field>
      </FieldGroup>
    </FieldSet>
  )

  expect(screen.getByText("Credenciales")).toHaveAttribute("data-variant", "legend")
  expect(screen.getByText("Usuario")).toHaveAttribute("for", "usuario")
  expect(document.querySelector("[data-slot=field]")).toHaveAttribute(
    "data-orientation",
    "vertical"
  )
  expect(screen.getByText("El mismo del portal.")).toHaveAttribute(
    "data-slot",
    "field-description"
  )
})

test("la leyenda chica y el campo horizontal cambian de marca", () => {
  render(
    <Field orientation="horizontal">
      <FieldLegend variant="label">Estado</FieldLegend>
      <FieldContent>
        <FieldTitle>Activo</FieldTitle>
      </FieldContent>
    </Field>
  )

  expect(screen.getByRole("group")).toHaveAttribute("data-orientation", "horizontal")
  expect(screen.getByText("Estado")).toHaveAttribute("data-variant", "label")
  expect(screen.getByText("Activo").parentElement).toHaveAttribute(
    "data-slot",
    "field-content"
  )
})

test("el separador marca si lleva texto en el medio", () => {
  const { rerender } = render(<FieldSeparator />)

  expect(document.querySelector("[data-slot=field-separator]")).toHaveAttribute(
    "data-content",
    "false"
  )

  rerender(<FieldSeparator>o</FieldSeparator>)
  expect(screen.getByText("o")).toHaveAttribute("data-slot", "field-separator-content")
})

test("el error de campo no renderiza nada cuando no hay nada que decir", () => {
  const { container, rerender } = render(<FieldError />)
  expect(container).toBeEmptyDOMElement()

  rerender(<FieldError errors={[]} />)
  expect(container).toBeEmptyDOMElement()
})

test("el error de campo muestra el mensaje que le pasan como hijo", () => {
  render(<FieldError className="mt-1">Ingresa tu contrasena.</FieldError>)

  const error = screen.getByRole("alert")
  expect(error).toHaveTextContent("Ingresa tu contrasena.")
  expect(error).toHaveClass("mt-1")
})

test("con varios errores los lista y deduplica los repetidos", () => {
  const { rerender } = render(<FieldError errors={[{ message: "Requerido." }]} />)

  // Uno solo va suelto, sin lista.
  expect(screen.getByRole("alert")).toHaveTextContent("Requerido.")
  expect(document.querySelector("li")).toBeNull()

  rerender(
    <FieldError
      errors={[
        { message: "Requerido." },
        { message: "Requerido." },
        { message: "Minimo 8 caracteres." },
        undefined,
      ]}
    />
  )

  const items = screen.getAllByRole("listitem")
  expect(items.map((item) => item.textContent)).toEqual([
    "Requerido.",
    "Minimo 8 caracteres.",
  ])
})
