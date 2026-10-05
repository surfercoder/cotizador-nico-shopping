import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ButtonLink } from "@/components/button-link"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  catalogoDelVehiculo,
  codigoDeFabricante,
  enlaceDeBusqueda,
} from "@/lib/catalogos"
import { requireAuthenticatedProfile } from "@/lib/dal"
import { fechaHoraArgentina } from "@/lib/fecha"
import { createClient } from "@/lib/supabase/server"
import { detalleDeCotizacion, MONEDAS } from "@/schemas/quote"

import { PrecioRow } from "./precio-form"

export const metadata: Metadata = { title: "Detalle de cotizacion" }

/** Un dato del encabezado. Los que Orion no mando no se muestran. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) {
  if (!valor) return null

  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm">{valor}</dd>
    </div>
  )
}

/**
 * Las piezas que hay que cotizar. Orion las manda en `getDetallePedido` y las
 * guardamos enteras en `detail`; aca se listan las que se cotizan de verdad.
 *
 * El detalle solo existe para las cotizaciones que alguien abrio en el portal
 * ("En Proceso"): las nuevas llegan sin piezas hasta que se abren.
 */
export default async function CotizacionPage({
  params,
}: PageProps<"/cotizaciones/[id]">) {
  const [, { id }, supabase] = await Promise.all([
    requireAuthenticatedProfile(),
    params,
    createClient(),
  ])

  const [{ data: cotizacion }, { data: items }, { data: catalogos }] =
    await Promise.all([
      supabase.from("quotes").select("*").eq("id", id).maybeSingle(),
      supabase.from("quote_items").select("*").eq("quote_id", id),
      supabase.from("catalogs").select("*").order("name"),
    ])

  if (!cotizacion) notFound()

  const detalle = detalleDeCotizacion(cotizacion.detail)
  const piezas = detalle?.piezas ?? []
  const catalogo = catalogoDelVehiculo(catalogos ?? [], cotizacion.vehiculo)
  const precios = new Map(
    (items ?? []).map((item) => [item.orion_repuesto_id, item])
  )
  // Solo las piezas que se listan: un precio de una linea que ya no esta no
  // cuenta.
  const cotizadas = piezas.flatMap((pieza) => {
    const item = precios.get(pieza.id)
    return item?.price != null ? [item] : []
  })
  // Un total por moneda: sumar dolares con pesos daria un numero sin sentido.
  const totales = MONEDAS.map((moneda) => ({
    moneda,
    total: cotizadas
      .filter((item) => item.currency === moneda)
      .reduce((suma, item) => suma + Number(item.price), 0),
  })).filter(({ total }) => total > 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <ButtonLink href="/" size="sm" variant="ghost">
          &larr; Cotizaciones
        </ButtonLink>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {cotizacion.vehiculo}
          {cotizacion.anio && ` (${cotizacion.anio})`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {[cotizacion.compania, cotizacion.perito].filter(Boolean).join(" · ")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* El VIN es con lo que se busca el vehiculo en los catalogos, asi que
            va primero y en monoespaciada para poder copiarlo sin equivocarse. */}
        <Dato etiqueta="VIN" valor={cotizacion.vin} />
        <Dato etiqueta="Patente" valor={cotizacion.patente} />
        <Dato etiqueta="Motor" valor={detalle?.tipoMotor} />
        <Dato etiqueta="Color" valor={detalle?.color?.descripcion} />
        <Dato etiqueta="Siniestro" valor={cotizacion.nro_siniestro} />
        <Dato
          etiqueta="Zona"
          valor={[cotizacion.zona, cotizacion.provincia]
            .filter(Boolean)
            .join(", ")}
        />
        <Dato
          etiqueta="Pedido"
          valor={
            cotizacion.fecha_pedido &&
            fechaHoraArgentina(cotizacion.fecha_pedido)
          }
        />
        <Dato
          etiqueta="Vence"
          valor={
            cotizacion.fecha_vencimiento &&
            fechaHoraArgentina(cotizacion.fecha_vencimiento)
          }
        />
      </dl>

      {detalle?.observPerito && (
        <div>
          <h2 className="text-sm font-medium">Observaciones del perito</h2>
          <p className="text-sm whitespace-pre-line text-muted-foreground">
            {detalle.observPerito}
          </p>
        </div>
      )}

      {piezas.length ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">
              {cotizadas.length} de {piezas.length} piezas cotizadas
              {catalogo && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  · catalogo {catalogo.name}
                </span>
              )}
            </h2>
            <p className="text-sm font-medium">
              {totales.map(({ moneda, total }) => (
                <span key={moneda} className="ml-4">
                  Total {moneda}{" "}
                  {total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                </span>
              ))}
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo Orion</TableHead>
                <TableHead>Pieza</TableHead>
                <TableHead>Numero de parte</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {piezas.map((pieza) => {
                const codigo = codigoDeFabricante(pieza.codRepuesto)
                const item = precios.get(pieza.id) ?? null

                return (
                  <PrecioRow
                    key={pieza.id}
                    quoteId={cotizacion.id}
                    pieza={pieza}
                    item={item}
                    catalogId={catalogo?.id ?? null}
                    codigo={codigo}
                    enlace={
                      catalogo &&
                      enlaceDeBusqueda(catalogo, item?.part_number ?? codigo)
                    }
                  />
                )
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Orion todavia no devolvio las piezas de esta cotizacion. Las manda
          recien cuando alguien la abre en el portal.
        </p>
      )}
    </div>
  )
}
