/**
 * Cliente de Sistema Orion. No es scraping de HTML: el portal expone WebMethods
 * de ASP.NET que devuelven JSON ({ d: ... }), asi que consumimos eso directo.
 *
 * Endpoint: POST /Repuestos/Controllers/CotizacionesControllerWF.aspx/GetListaCotizaciones
 * Devuelve como maximo 200 filas por llamada, ordenadas por fechaPedido desc,
 * asi que se pagina moviendo `fechaPedidoHasta` hacia atras.
 */

const BASE = "https://www.sistema-orion.com"
const LOGIN_URL = `${BASE}/portal/views/Login.aspx`
const GET_EMPRESAS_URL = `${BASE}/portal/Controllers/LoginOrionControllerWF.aspx/GetEmpresas`
const USER_LOG_URL = `${BASE}/Repuestos/Controllers/CotizacionesControllerWF.aspx/getUserLog`
/**
 * "Orion Repuestos" es el sistema 9 del portal (el icono del header; 12 es
 * Orion Cesvicom, que para este usuario no devuelve ninguna empresa).
 */
const ID_SISTEMA = 9
const COTIZACIONES_URL = `${BASE}/Repuestos/Views/Cotizaciones.aspx?show=N`
const LISTA_URL = `${BASE}/Repuestos/Controllers/CotizacionesControllerWF.aspx/GetListaCotizaciones`
/**
 * Las tres solapas del portal salen del mismo endpoint, cambiando el estado:
 * "Nuevas" son las que nadie toco todavia y "En Proceso" las que ya se abrieron
 * (ahi el detalle trae las piezas). El historico, estado 5, no nos interesa.
 */
export const NUEVAS = 0
export const EN_PROCESO = 1
/**
 * El combo "Asegurado / Tercero" de la grilla: 1 = asegurado, 2 = tercero,
 * 3 = las dos. Trabajamos sobre asegurados, que es el recorte que miran los
 * duenos todos los dias.
 */
export const ASEGURADO = 1
const DETALLE_URL = `${BASE}/Repuestos/Controllers/CotizacionControllerWF.aspx/getDetallePedido`
const detallePageUrl = (encrypted: string) =>
  `${BASE}/Repuestos/Views/Cotizacion.aspx?IdCotiz=${encodeURIComponent(encrypted)}&case=N`
const PAGE_SIZE = 200
/**
 * Orion a veces deja la conexion abierta sin contestar. fetch no tiene timeout
 * propio, asi que sin esto una corrida del cron se queda colgada hasta que la
 * mata la plataforma.
 */
const TIMEOUT_MS = 30_000

export type OrionSession = {
  cookie: string
  empresaId: number
  empresa: string
}

/**
 * Reproduce los pasos que el operador hace a mano, porque la sesion recien
 * sirve para Repuestos cuando estan todos:
 *   1. postback de WebForms con usuario y clave (hay que devolver el __VIEWSTATE),
 *   2. elegir "Orion Repuestos" y la empresa: segundo postback con los hidden
 *      que completa el JS del modal, y ahi el portal redirige al subsistema,
 *   3. abrir Cotizaciones.aspx, que es sobre lo que trabaja el controller.
 * Ojo: despues del paso 1 el portal deja `hdnIdSistema` en 0 igual que antes de
 * loguear (lo setea el click del icono), asi que no sirve como senal de exito:
 * cuando las credenciales estan mal el portal responde con un alert().
 */
export async function login(
  usuario: string,
  password: string
): Promise<OrionSession> {
  const jar = new Map<string, string>()

  const loginPage = await request(jar, LOGIN_URL)
  const html = await loginPage.text()

  const credenciales = {
    txtNroDoc: usuario,
    txtPass: password,
    hdnIp: "",
  }

  const posted = await request(
    jar,
    LOGIN_URL,
    postback(html, { ...credenciales, btnIngresar: "ENTRAR", hdnIdSistema: "0" })
  )
  const respuesta = await posted.text()

  // El portal no usa un campo de error: tira un alert() en el HTML.
  const alerta = respuesta.match(/alert\('([^']+)'\)/)?.[1]
  if (alerta) throw new Error(alerta)

  // Las empresas del modal. El usuario puede tener mas de una (Trantor y Andes
  // Car): se toma la primera, igual que el combo, y el nombre viaja en el
  // resultado del sync para que se note si algun dia cambia el orden.
  const empresas = (await postJson(jar, GET_EMPRESAS_URL, {
    nroDocumento: usuario,
    idSistema: ID_SISTEMA,
  })) as { id: number; razonSocial: string }[] | null

  const empresa = empresas?.[0]
  if (!empresa) {
    throw new Error("Orion no devolvio ninguna empresa para este usuario")
  }

  await request(
    jar,
    LOGIN_URL,
    postback(respuesta, {
      ...credenciales,
      btnAceptar: "Aceptar",
      hdnIdSistema: String(ID_SISTEMA),
      hdnIdEmpresa: String(empresa.id),
      // 1 = "entrar al sistema con esta empresa", que es lo que deja el JS.
      hdnIngSist: "1",
    })
  )

  // El postback anterior ya redirige a InicioRepuestos.aspx?SessionId=..., que
  // es lo que abre la sesion del subsistema. Abrimos la pagina de cotizaciones
  // nuevas porque el controller trabaja sobre lo que deja esa pagina.
  await request(jar, COTIZACIONES_URL)

  // getUserLog solo contesta con la sesion del subsistema abierta, asi que
  // confirma el login y de paso da el id que la grilla manda como
  // idRepuestero / idEmpresaRepuestero.
  const user = (await postJson(jar, USER_LOG_URL, {})) as {
    empresa?: { id?: number }
  } | null
  const empresaId = user?.empresa?.id
  if (!empresaId) {
    throw new Error(
      "La sesion de Orion no quedo abierta (puede estar pidiendo codigo de 2 factores)"
    )
  }

  return { cookie: cookieHeader(jar), empresaId, empresa: empresa.razonSocial }
}

/** Arma el POST de un postback de WebForms reusando el __VIEWSTATE de la pagina. */
function postback(html: string, campos: Record<string, string>): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      __EVENTTARGET: "",
      __EVENTARGUMENT: "",
      __VIEWSTATE: hiddenValue(html, "__VIEWSTATE"),
      __VIEWSTATEGENERATOR: hiddenValue(html, "__VIEWSTATEGENERATOR"),
      hdnIdSistema: "0",
      hdnIdEmpresa: "0",
      hdnIngSist: "0",
      ...campos,
    }),
  }
}

function hiddenValue(html: string, name: string): string {
  const match = html.match(
    new RegExp(`id="${name}"[^>]*value="([^"]*)"`)
  )
  return match?.[1] ?? ""
}

const cookieHeader = (jar: Map<string, string>) =>
  [...jar].map(([name, value]) => `${name}=${value}`).join("; ")

/**
 * fetch no maneja cookies, asi que se guardan a mano y se siguen los redirects
 * de a uno para no perder las que se setean en el medio.
 */
async function request(
  jar: Map<string, string>,
  url: string,
  init?: RequestInit,
  saltos = 5
): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    redirect: "manual",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { ...init?.headers, Cookie: cookieHeader(jar) },
  })

  for (const raw of response.headers.getSetCookie()) {
    const [pair] = raw.split(";")
    const separador = pair.indexOf("=")
    if (separador > 0) {
      jar.set(pair.slice(0, separador).trim(), pair.slice(separador + 1).trim())
    }
  }

  const location = response.headers.get("location")
  if (location && response.status >= 300 && response.status < 400) {
    if (saltos === 0) throw new Error("Demasiados redirects en Orion")
    return request(jar, new URL(location, url).toString(), undefined, saltos - 1)
  }

  return response
}

async function postJson(
  jar: Map<string, string>,
  url: string,
  payload: unknown
): Promise<unknown> {
  const response = await request(jar, url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    // ASP.NET devuelve el detalle del error en { Message } y sin eso no hay
    // forma de saber por que fallo: el status solo dice 500.
    const detalle = (await response.text().catch(() => "")).slice(0, 300)
    throw new Error(`Orion respondio ${response.status} en ${url}: ${detalle}`)
  }

  const body = (await response.json()) as { d?: unknown }
  return body.d ?? null
}

/** Fila cruda de la grilla. Solo se tipa lo que usamos. */
type GrillaCotizacion = {
  idCotizacion: number
  /** Id cifrado con el que viaja la cotizacion en la URL y en getDetallePedido. */
  idCotizacionEncrypt: string
  nroSiniestro: string | null
  compania: string | null
  perito: string | null
  vehiculo: string | null
  patente: string | null
  cantPiezas: number | null
  tipoAsegurado: string | null
  fechaPedido: string | null
  fechaVencimiento: string | null
  Estado: { descripcion: string | null } | null
  zona: {
    descripcion: string | null
    provincia: { descripcion: string | null } | null
  } | null
}

/**
 * .NET serializa las fechas como "/Date(1790277420000)/". Las que nunca se
 * cargaron vienen con DateTime.MinValue (ms negativos gigantes) y valen null.
 */
export function parseNetDate(value: string | null | undefined): string | null {
  const ms = Number(value?.match(/-?\d+/)?.[0])
  if (!Number.isFinite(ms) || ms <= 0) return null
  return new Date(ms).toISOString()
}

export function mapCotizacion(row: GrillaCotizacion, platformId: string) {
  return {
    platform_id: platformId,
    external_id: String(row.idCotizacion),
    nro_siniestro: row.nroSiniestro,
    compania: row.compania,
    perito: row.perito,
    vehiculo: row.vehiculo,
    patente: row.patente,
    zona: row.zona?.descripcion ?? null,
    provincia: row.zona?.provincia?.descripcion ?? null,
    cant_piezas: row.cantPiezas,
    // Orion manda el booleano como string "True"/"False".
    es_asegurado: row.tipoAsegurado === "True",
    estado: row.Estado?.descripcion ?? null,
    fecha_pedido: parseNetDate(row.fechaPedido),
    fecha_vencimiento: parseNetDate(row.fechaVencimiento),
    raw: row,
    synced_at: new Date().toISOString(),
  }
}

export type OrionQuote = ReturnType<typeof mapCotizacion>

/**
 * Trae todas las cotizaciones de una solapa paginando hacia atras en el tiempo.
 * `cookie` es la cookie de sesion de ASP.NET que devuelve el login.
 *
 * `desde` es el piso de fechaPedido en ISO ("2026-09-28T03:00:00.000Z" para el
 * dia de hoy en Argentina), igual que lo manda el portal cuando el operador
 * elige el dia: sin eso la grilla devuelve todo el historico.
 */
export async function fetchCotizaciones({
  cookie,
  empresaId,
  estado = NUEVAS,
  condicion = ASEGURADO,
  desde = "",
  maxPages = 10,
}: {
  cookie: string
  empresaId: number
  estado?: number
  condicion?: number
  desde?: string
  maxPages?: number
}): Promise<GrillaCotizacion[]> {
  const porId = new Map<number, GrillaCotizacion>()
  let hasta = ""

  for (let page = 0; page < maxPages; page++) {
    const rows = await fetchPagina({
      cookie,
      empresaId,
      estado,
      condicion,
      desde,
      hasta,
    })
    for (const row of rows) porId.set(row.idCotizacion, row)

    if (rows.length < PAGE_SIZE) break

    // La proxima pagina arranca en la fila mas vieja de esta. El solapamiento
    // de las que caen justo en ese minuto lo absorbe el Map.
    const masVieja = Math.min(
      ...rows.map((row) => Number(row.fechaPedido?.match(/-?\d+/)?.[0] ?? NaN))
    )
    // El chequeo va antes de construir la fecha: con una fila sin fechaPedido
    // `new Date(NaN).toISOString()` tira RangeError y se cae toda la corrida.
    if (!Number.isFinite(masVieja)) break
    const siguiente = new Date(masVieja).toISOString()
    if (siguiente === hasta) break
    hasta = siguiente
  }

  return [...porId.values()]
}

async function fetchPagina({
  cookie,
  empresaId,
  estado,
  condicion,
  desde,
  hasta,
}: {
  cookie: string
  empresaId: number
  estado: number
  condicion: number
  desde: string
  hasta: string
}): Promise<GrillaCotizacion[]> {
  const response = await fetch(LISTA_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Cookie: cookie,
    },
    body: JSON.stringify({
      param: {
        nroSiniestro: "",
        vehiculo: "",
        fechaPedidoDesde: desde,
        fechaPedidoHasta: hasta,
        idRepuestero: String(empresaId),
        idCompania: "0",
        patente: "",
        NroDocumentoPerito: "0",
        condicion: String(condicion),
        idEmpresaRepuestero: empresaId,
        NroDocumentoTramitador: "0",
        estadoCotizacion: estado,
        // 0 = de cualquier usuario de la empresa, no solo del que esta logueado.
        usuario: 0,
      },
    }),
  })

  if (!response.ok) {
    const detalle = (await response.text().catch(() => "")).slice(0, 300)
    throw new Error(
      `Orion respondio ${response.status} al listar cotizaciones: ${detalle}`
    )
  }

  const payload = (await response.json()) as { d?: GrillaCotizacion[] }
  return payload.d ?? []
}

/** Pieza pedida por el perito. El precio lo cargamos nosotros al cotizar. */
export type OrionRepuesto = {
  id: number
  idPieza: number
  descripcion: string | null
  codRepuesto: string | null
  descrDisponibilidad: string | null
  precioLegitimo: number | null
}

/** Detalle de la cotizacion. Solo se tipa lo que leemos; se guarda entero. */
export type OrionDetalle = {
  nroSiniestro: string | null
  vin: string | null
  anioFabricacion: string | null
  tipoMotor: string | null
  nroMotor: string | null
  color: { descripcion: string | null } | null
  cantPiezas: number | null
  observPerito: string | null
  listRepuestos: OrionRepuesto[] | null
}

/**
 * El detalle de cada cotizacion: trae el VIN (con el que se buscan las piezas
 * en los catalogos), el anio y la lista de repuestos a cotizar. No hace falta
 * abrir la pagina de cada una: el id cifrado ya viene en la grilla.
 *
 * Los ids que fallan quedan afuera del Map en vez de cortar la corrida.
 */
export async function fetchDetalles({
  cookie,
  encryptedIds,
}: {
  cookie: string
  encryptedIds: string[]
}): Promise<Map<string, OrionDetalle>> {
  const detalles = new Map<string, OrionDetalle>()
  if (encryptedIds.length === 0) return detalles

  // getDetallePedido tira NullReferenceException hasta que se abre una vez
  // Cotizacion.aspx: el controller lee algo que deja esa pagina en la sesion.
  // Con abrir una sola alcanza para pedir todas las demas.
  await fetch(detallePageUrl(encryptedIds[0]), {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Cookie: cookie },
  })

  for (const encrypted of encryptedIds) {
    try {
      detalles.set(encrypted, await fetchDetalle(cookie, encrypted))
    } catch {
      // Una cotizacion que Orion no quiere devolver no puede tirar abajo el
      // resto: se reintenta sola en la proxima corrida, que mira detail null.
    }
  }

  return detalles
}

async function fetchDetalle(
  cookie: string,
  encrypted: string
): Promise<OrionDetalle> {
  const response = await fetch(DETALLE_URL, {
    method: "POST",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Cookie: cookie,
    },
    body: JSON.stringify({ idCotizacionEncrypt: encrypted }),
  })

  if (!response.ok) {
    const detalle = (await response.text().catch(() => "")).slice(0, 300)
    throw new Error(
      `Orion respondio ${response.status} al traer el detalle: ${detalle}`
    )
  }

  const payload = (await response.json()) as { d?: OrionDetalle }
  if (!payload.d) throw new Error("Orion devolvio un detalle vacio")
  return payload.d
}
