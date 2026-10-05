import type { Metadata } from "next"
import Link from "next/link"

import { ButtonLink } from "@/components/button-link"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button-variants"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireAuthenticatedProfile } from "@/lib/dal"
import {
  diaArgentina,
  diaHoraArgentina,
  horaArgentina,
  inicioDelDiaArgentina,
} from "@/lib/fecha"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Cotizaciones" }

/**
 * Cuanto falta para que venza: "2h 15m" / "18m", y si entra en la ventana
 * critica de 2 horas. Va fuera del componente porque mira el reloj.
 */
function restante(vencimiento: string | null) {
  if (!vencimiento) return { texto: null, urgente: false }

  const minutos = Math.floor(
    (new Date(vencimiento).getTime() - Date.now()) / 60000
  )
  if (minutos <= 0) return { texto: "vencida", urgente: true }

  const horas = Math.floor(minutos / 60)
  return {
    texto: horas > 0 ? `${horas}h ${minutos % 60}m` : `${minutos}m`,
    urgente: minutos < 120,
  }
}

/** El tope es para no colgar la pagina, no un filtro: si se toca, se avisa. */
const TOPE_FILAS = 1000

/**
 * El listado se divide por plataforma, no por provincia: el operador trabaja
 * abriendo el portal de la plataforma (Orion, Claims, ...) y cotizando ahi, asi
 * que la pestaña es la cola de trabajo de ese portal.
 *
 * Esta pantalla es el espejo de la grilla de Orion para el dia de hoy y no
 * esconde nada: mismo recorte que hace el portal (pedidos de hoy, asegurados) y
 * mismo orden (lo ultimo pedido primero), para poder compararlas fila por fila.
 * Las que ya vencieron se siguen listando, marcadas como vencidas.
 */
export default async function CotizacionesPage({
  searchParams,
}: PageProps<"/">) {
  // Las tres son independientes: en serie el usuario espera tres veces.
  const [, { plataforma }, supabase] = await Promise.all([
    requireAuthenticatedProfile(),
    searchParams,
    createClient(),
  ])

  const { data: platforms } = await supabase
    .from("platforms")
    .select("id, slug, name, login_url, last_sync_at")
    .eq("is_active", true)
    .order("name")

  const activa = platforms?.find((item) => item.slug === plataforma) ?? null
  const nombrePorId = new Map((platforms ?? []).map((p) => [p.id, p.name]))

  let query = supabase
    .from("quotes")
    // count exacto: es el numero que se compara contra el total del portal.
    .select("*", { count: "exact" })
    .gte("fecha_pedido", inicioDelDiaArgentina())
    .eq("es_asegurado", true)
    .order("fecha_pedido", { ascending: false })
    .limit(TOPE_FILAS)

  if (activa) query = query.eq("platform_id", activa.id)

  const { data: cotizaciones, count } = await query

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cotizaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            {count ?? 0} pedidos de asegurados del {diaArgentina()}
            {activa ? ` en ${activa.name}` : ""}, del mas nuevo al mas viejo.
          </p>
        </div>
        {activa && (
          <a
            href={activa.login_url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            Abrir {activa.name}
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ButtonLink href="/" size="sm" variant={activa ? "ghost" : "default"}>
          Todas
        </ButtonLink>
        {(platforms ?? []).map((item) => (
          <ButtonLink
            key={item.id}
            href={`/?plataforma=${item.slug}`}
            size="sm"
            variant={activa?.id === item.id ? "default" : "ghost"}
          >
            {item.name}
          </ButtonLink>
        ))}
        {activa?.last_sync_at && (
          <span className="ml-2 text-xs text-muted-foreground">
            Actualizado {diaHoraArgentina(activa.last_sync_at)}
          </span>
        )}
      </div>

      {cotizaciones?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Vence</TableHead>
              {!activa && <TableHead>Plataforma</TableHead>}
              <TableHead>Compania</TableHead>
              <TableHead>Vehiculo</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead className="text-right">Piezas</TableHead>
              <TableHead>Siniestro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cotizaciones.map((cotizacion) => {
              const { texto, urgente } = restante(cotizacion.fecha_vencimiento)

              return (
                <TableRow key={cotizacion.id}>
                  {/* La hora del pedido es con la que se cotejan las dos
                      grillas: es la columna por la que ordena el portal. */}
                  <TableCell className="text-sm">
                    <Link
                      href={`/cotizaciones/${cotizacion.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {cotizacion.fecha_pedido
                        ? horaArgentina(cotizacion.fecha_pedido)
                        : "Ver"}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {cotizacion.estado}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={urgente ? "destructive" : "secondary"}>
                      {texto}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {cotizacion.fecha_vencimiento &&
                        diaHoraArgentina(cotizacion.fecha_vencimiento)}
                    </div>
                  </TableCell>
                  {!activa && (
                    <TableCell className="text-sm">
                      {nombrePorId.get(cotizacion.platform_id) ?? "-"}
                    </TableCell>
                  )}
                  {/* whitespace-normal: TableCell viene con nowrap y los
                      nombres largos de las companias se montaban sobre la
                      columna de al lado en vez de cortar. */}
                  <TableCell className="max-w-56 text-sm whitespace-normal">
                    {cotizacion.compania}
                    <div className="text-xs text-muted-foreground">
                      {cotizacion.perito}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cotizacion.vehiculo}
                    {cotizacion.anio && ` (${cotizacion.anio})`}
                    <div className="text-xs text-muted-foreground">
                      {cotizacion.patente}
                      {/* El VIN es lo que se usa para buscar las piezas en los
                          catalogos, asi que se muestra apenas esta. */}
                      {cotizacion.vin && ` · ${cotizacion.vin}`}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cotizacion.zona}
                    <div className="text-xs text-muted-foreground">
                      {cotizacion.provincia}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {cotizacion.cant_piezas}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {cotizacion.nro_siniestro}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          Todavia no hay cotizaciones de hoy. Si la ultima sincronizacion es
          vieja, entra a Plataformas y usa &quot;Sincronizar ahora&quot;.
        </p>
      )}

      {count !== null && count > TOPE_FILAS && (
        <p className="text-sm text-destructive">
          Se listan las primeras {TOPE_FILAS} de {count}. Hay que paginar la
          tabla antes de mostrarla asi.
        </p>
      )}
    </div>
  )
}
