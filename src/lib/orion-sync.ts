import "server-only"

import { inicioDelDiaArgentina } from "@/lib/fecha"
import {
  EN_PROCESO,
  fetchCotizaciones,
  fetchDetalles,
  login,
  mapCotizacion,
  NUEVAS,
} from "@/lib/orion"
import { createAdminClient } from "@/lib/supabase/admin"

/** `empresa` viaja para que se note si Orion cambia la empresa por defecto. */
export type SyncResult = {
  plataforma: string
  traidas: number
  detalles: number
  empresa: string | null
}

/**
 * Corrida completa: credenciales del vault -> login en Orion -> listado
 * paginado -> upsert en `quotes`. Idempotente: se puede correr cada 20 minutos
 * sin duplicar nada porque la clave es (platform_id, external_id).
 *
 * Se leen las dos solapas que le sirven al operador: "Nuevas" (nadie las tomo)
 * y "En Proceso" (alguien ya las abrio en Orion). Las dos son solo lectura: la
 * que toma una cotizacion es `updateEstadoInicial`, que no llamamos nunca.
 */
export async function syncOrion(): Promise<SyncResult> {
  const supabase = createAdminClient()

  const { data: platform, error: platformError } = await supabase
    .from("platforms")
    .select("id, name, is_active")
    .eq("slug", "orion")
    .single()

  if (platformError || !platform) throw new Error("No existe la plataforma orion")
  if (!platform.is_active) {
    return { plataforma: platform.name, traidas: 0, detalles: 0, empresa: null }
  }

  try {
    const { data: credenciales } = await supabase.rpc(
      "get_platform_credentials",
      { p_platform_id: platform.id }
    )
    const credencial = credenciales?.[0]
    if (!credencial) throw new Error("La plataforma no tiene credenciales cargadas")

    const sesion = await login(credencial.username, credencial.password)
    const cookie = sesion.cookie
    const empresaId = sesion.empresaId

    // Misma consulta que hace el operador en el portal: asegurados (el default
    // de fetchCotizaciones), todas las companias, acotado por fecha de pedido.
    //
    // El piso es el arranque de AYER, no el de hoy: el cron no corre de noche y
    // un pedido cargado a las 23:00 tiene que entrar igual en la primera corrida
    // de la manana, cuando "hoy" ya es otro dia. Sobran filas, no faltan.
    const desde = inicioDelDiaArgentina(new Date(Date.now() - 24 * 60 * 60_000))

    const nuevas = await fetchCotizaciones({
      cookie,
      empresaId,
      estado: NUEVAS,
      desde,
    })
    const enProceso = await fetchCotizaciones({
      cookie,
      empresaId,
      estado: EN_PROCESO,
      desde,
    })

    // Orion manda "Pendiente" en las dos solapas, asi que el estado que guardamos
    // es de que lista salio, que es lo que de verdad distingue una de otra.
    const filas = [
      ...nuevas.map((fila) => mapCotizacion(fila, platform.id)),
      ...enProceso.map((fila) => ({
        ...mapCotizacion(fila, platform.id),
        estado: "En proceso",
      })),
    ]

    if (filas.length > 0) {
      const { error } = await supabase
        .from("quotes")
        .upsert(filas, { onConflict: "platform_id,external_id" })
      if (error) throw new Error(`No pudimos guardar las cotizaciones: ${error.message}`)
    }

    // Primero las que ya estan en proceso, porque son las unicas que traen las
    // piezas: con lo que sobre del cupo se completan los VIN de las nuevas.
    const conPiezas = await syncDetalles(supabase, platform.id, enProceso, cookie, {
      filtro: "sin-piezas",
      cupo: DETALLES_POR_CORRIDA,
      estado: "En proceso",
    })
    const detalles =
      conPiezas +
      (await syncDetalles(supabase, platform.id, nuevas, cookie, {
        filtro: "sin-detalle",
        cupo: DETALLES_POR_CORRIDA - conPiezas,
      }))

    await supabase
      .from("platforms")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
      .eq("id", platform.id)

    return {
      plataforma: platform.name,
      traidas: filas.length,
      detalles,
      empresa: sesion.empresa,
    }
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido"
    await supabase
      .from("platforms")
      .update({ last_sync_at: new Date().toISOString(), last_sync_error: mensaje })
      .eq("id", platform.id)
    throw error
  }
}

const DETALLES_POR_CORRIDA = 60

/**
 * El detalle (getDetallePedido) de cada cotizacion: VIN, anio y, cuando ya esta
 * en proceso, las piezas que pide el perito. De las nuevas se pide una sola vez
 * (`sin-detalle`); de las que estan en proceso se vuelve a pedir hasta que traiga
 * las piezas (`sin-piezas`), porque una cotizacion que sincronizamos cuando era
 * nueva quedo guardada con la lista vacia.
 *
 * Cada detalle es un request y Orion tarda mas de un segundo en contestarlo, asi
 * que se hace de a tandas: en 20 minutos el cron corre de nuevo y sigue por
 * donde quedo, empezando siempre por lo que vence antes.
 *
 * ponytail: tanda fija y secuencial. Si hace falta ponerse al dia mas rapido,
 * pedir de a varios en paralelo antes que subir el tope.
 */
async function syncDetalles(
  supabase: ReturnType<typeof createAdminClient>,
  platformId: string,
  filas: Awaited<ReturnType<typeof fetchCotizaciones>>,
  cookie: string,
  {
    filtro,
    cupo,
    estado,
  }: { filtro: "sin-detalle" | "sin-piezas"; cupo: number; estado?: string }
): Promise<number> {
  if (cupo <= 0 || filas.length === 0) return 0

  // Se pregunta por las de esta grilla y nada mas: si el cupo se llenara con
  // filas de la otra lista, la tanda se iria en pedir detalles que ya tenemos.
  const query = supabase
    .from("quotes")
    .select("external_id")
    .eq("platform_id", platformId)
    .in("external_id", filas.map((fila) => String(fila.idCotizacion)))
    .gt("fecha_vencimiento", new Date().toISOString())
    .order("fecha_vencimiento", { ascending: true })
    .limit(cupo)

  const { data: pendientes } =
    filtro === "sin-detalle"
      ? await query.is("detail", null)
      : await query.is("tiene_piezas", false)

  const faltan = new Set((pendientes ?? []).map((quote) => quote.external_id))
  const objetivo = filas.filter((fila) => faltan.has(String(fila.idCotizacion)))
  if (objetivo.length === 0) return 0

  const detalles = await fetchDetalles({
    cookie,
    encryptedIds: objetivo.map((fila) => fila.idCotizacionEncrypt),
  })

  const ahora = new Date().toISOString()
  const filasConDetalle = objetivo.flatMap((fila) => {
    const detalle = detalles.get(fila.idCotizacionEncrypt)
    if (!detalle) return []
    return [
      {
        ...mapCotizacion(fila, platformId),
        ...(estado ? { estado } : {}),
        detail: detalle,
        detail_synced_at: ahora,
      },
    ]
  })
  if (filasConDetalle.length === 0) return 0

  const { error } = await supabase
    .from("quotes")
    .upsert(filasConDetalle, { onConflict: "platform_id,external_id" })
  if (error) throw new Error(`No pudimos guardar el detalle: ${error.message}`)

  return filasConDetalle.length
}
