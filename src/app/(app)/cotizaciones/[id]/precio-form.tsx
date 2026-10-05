"use client"

import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { TableCell, TableRow } from "@/components/ui/table"
import { initialActionState } from "@/lib/action-state"
import { MONEDAS, type QuoteItem, type Repuesto } from "@/schemas/quote"

import { guardarPrecio } from "./actions"

/**
 * Una fila de la cotizacion. El `<form>` no puede envolver celdas de una
 * tabla, asi que vive en la ultima y los inputs se le asocian con `form`.
 */
export function PrecioRow({
  quoteId,
  pieza,
  item,
  catalogId,
  codigo,
  enlace,
}: {
  quoteId: string
  pieza: Repuesto
  item: QuoteItem | null
  catalogId: string | null
  /** Codigo de fabricante normalizado: el numero de parte hasta que se edite. */
  codigo: string | null
  enlace: string | null
}) {
  const [state, formAction] = useActionState(guardarPrecio, initialActionState)
  const formId = `precio-${pieza.id}`
  const error =
    state.fieldErrors?.price?.[0] ??
    state.fieldErrors?.partNumber?.[0] ??
    (state.ok ? undefined : state.message)

  return (
    <TableRow>
      <TableCell className="font-mono text-xs">
        {pieza.codRepuesto || "-"}
      </TableCell>
      <TableCell className="text-sm whitespace-normal">
        {pieza.descripcion}
        {enlace && (
          <a
            href={enlace}
            target="_blank"
            rel="noreferrer"
            className="ml-2 text-xs text-muted-foreground underline underline-offset-4"
          >
            Buscar
          </a>
        )}
      </TableCell>
      <TableCell>
        <Input
          form={formId}
          name="partNumber"
          aria-label={`Numero de parte de ${pieza.descripcion}`}
          defaultValue={item?.part_number ?? codigo ?? ""}
          className="h-8 w-36 font-mono text-xs"
        />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Input
            form={formId}
            name="price"
            inputMode="decimal"
            aria-label={`Precio de ${pieza.descripcion}`}
            aria-invalid={Boolean(state.fieldErrors?.price)}
            defaultValue={item?.price ?? ""}
            className="h-8 w-24 text-right"
          />
          <select
            form={formId}
            name="currency"
            aria-label={`Moneda de ${pieza.descripcion}`}
            defaultValue={item?.currency ?? "USD"}
            className="h-8 rounded-md border bg-transparent px-1 text-xs"
          >
            {MONEDAS.map((moneda) => (
              <option key={moneda}>{moneda}</option>
            ))}
          </select>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </TableCell>
      <TableCell>
        <form id={formId} action={formAction}>
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="repuestoId" value={pieza.id} />
          <input type="hidden" name="catalogId" value={catalogId ?? ""} />
          <SubmitButton size="sm" variant="outline">
            {state.ok ? "Guardado" : "Guardar"}
          </SubmitButton>
        </form>
      </TableCell>
    </TableRow>
  )
}
