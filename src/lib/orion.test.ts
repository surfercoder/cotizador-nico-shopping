/**
 * @jest-environment node
 */
import {
  ASEGURADO,
  EN_PROCESO,
  fetchCotizaciones,
  fetchDetalles,
  login,
  mapCotizacion,
  NUEVAS,
  parseNetDate,
} from "./orion"

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>

const llamadas: { url: string; init?: RequestInit }[] = []

const mockFetch = (handler: Handler) =>
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input)
    llamadas.push({ url, init })
    return handler(url, init)
  })

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })

const cuerpo = (init?: RequestInit) =>
  new URLSearchParams(String(init?.body ?? ""))

const PAGINA_LOGIN = `<input id="__VIEWSTATE" value="vs-1" /><input id="__VIEWSTATEGENERATOR" value="gen-1" />`

/** Portal con las cookies que setea ASP.NET en el primer GET. */
const loginHandler = (overrides: Partial<Record<string, Handler>> = {}) => {
  const handler: Handler = (url, init) => {
    if (url.includes("Login.aspx") && init?.method !== "POST") {
      return new Response(PAGINA_LOGIN, {
        headers: [
          ["set-cookie", "ASP.NET_SessionId=abc; path=/; HttpOnly"],
          // Una cookie sin "=" no puede tirar abajo el parseo.
          ["set-cookie", "malformada"],
        ],
      })
    }
    if (url.includes("Login.aspx")) {
      const campos = cuerpo(init)
      return campos.get("btnAceptar")
        ? new Response(null, {
            status: 302,
            headers: { location: "/portal/InicioRepuestos.aspx?SessionId=1" },
          })
        : new Response("<html>sin alerta</html>", {
            headers: { "set-cookie": ".ASPXAUTH=xyz; path=/" },
          })
    }
    if (url.includes("GetEmpresas")) {
      return json({ d: [{ id: 5, razonSocial: "Trantor" }] })
    }
    if (url.includes("getUserLog")) return json({ d: { empresa: { id: 77 } } })
    return new Response("ok")
  }

  return mockFetch((url, init) => {
    for (const [fragmento, propio] of Object.entries(overrides)) {
      if (url.includes(fragmento) && propio) return propio(url, init)
    }
    return handler(url, init)
  })
}

beforeEach(() => {
  llamadas.length = 0
  jest.restoreAllMocks()
})

test("parsea las fechas de .NET y descarta DateTime.MinValue", () => {
  expect(parseNetDate("/Date(1790277420000)/")).toEqual("2026-09-24T19:17:00.000Z")
  expect(parseNetDate("/Date(-62135586000000)/")).toEqual(null)
  expect(parseNetDate("")).toEqual(null)
  expect(parseNetDate(null)).toEqual(null)
  expect(parseNetDate(undefined)).toEqual(null)
})

test("mapea una fila de la grilla a la fila de quotes", () => {
  const row = {
    idCotizacion: 266472296,
    idCotizacionEncrypt: "viwLEGffXYJoOS9lnxlksQ==",
    nroSiniestro: "2004100971",
    compania: "SANCOR",
    perito: "CABRERA LEANDRO DANIEL",
    vehiculo: "VOLKSWAGEN AMAROK",
    patente: "AF-232-AO",
    cantPiezas: 1,
    tipoAsegurado: "True",
    fechaPedido: "/Date(1790277420000)/",
    fechaVencimiento: "/Date(1790281200000)/",
    Estado: { descripcion: "Pendiente" },
    zona: { descripcion: "El Dorado", provincia: { descripcion: "Misiones" } },
  }

  const quote = mapCotizacion(row, "11111111-1111-1111-1111-111111111111")

  expect(quote.external_id).toEqual("266472296")
  expect(quote.es_asegurado).toEqual(true)
  expect(quote.zona).toEqual("El Dorado")
  expect(quote.provincia).toEqual("Misiones")
  expect(quote.estado).toEqual("Pendiente")
  expect(quote.fecha_vencimiento).toEqual("2026-09-24T20:20:00.000Z")
  // El tercero viaja como string "False", no como booleano.
  expect(mapCotizacion({ ...row, tipoAsegurado: "False" }, "x").es_asegurado).toEqual(
    false
  )
  // Sin zona ni estado no rompe: la grilla los manda null en algunas filas.
  const pelada = mapCotizacion({ ...row, zona: null, Estado: null }, "x")
  expect(pelada.zona).toEqual(null)
  expect(pelada.provincia).toEqual(null)
  expect(pelada.estado).toEqual(null)
  // Zona cargada pero sin provincia.
  expect(
    mapCotizacion({ ...row, zona: { descripcion: "El Dorado", provincia: null } }, "x")
      .provincia
  ).toEqual(null)
})

test("el login encadena los dos postbacks y devuelve la sesion del subsistema", async () => {
  loginHandler()

  await expect(login("27123456789", "clave")).resolves.toEqual({
    cookie: "ASP.NET_SessionId=abc; .ASPXAUTH=xyz",
    empresaId: 77,
    empresa: "Trantor",
  })

  // El primer postback reusa el __VIEWSTATE de la pagina de login.
  const primerPost = llamadas.find(
    (llamada) => llamada.init?.method === "POST" && cuerpo(llamada.init).has("btnIngresar")
  )
  expect(cuerpo(primerPost?.init).get("__VIEWSTATE")).toBe("vs-1")
  expect(cuerpo(primerPost?.init).get("__VIEWSTATEGENERATOR")).toBe("gen-1")

  // El segundo manda la empresa elegida; esa respuesta ya no trae hidden, y el
  // viewstate vacio no rompe el postback.
  const segundoPost = llamadas.find(
    (llamada) => llamada.init?.method === "POST" && cuerpo(llamada.init).has("btnAceptar")
  )
  expect(cuerpo(segundoPost?.init).get("hdnIdEmpresa")).toBe("5")
  expect(cuerpo(segundoPost?.init).get("__VIEWSTATE")).toBe("")

  // El 302 del postback se sigue a mano, con las cookies ya juntadas.
  expect(llamadas.some((llamada) => llamada.url.includes("InicioRepuestos.aspx"))).toBe(
    true
  )
  expect(llamadas.at(-1)?.init?.headers).toMatchObject({
    Cookie: "ASP.NET_SessionId=abc; .ASPXAUTH=xyz",
  })
})

test("el login avisa con el mismo texto del alert cuando la clave esta mal", async () => {
  loginHandler({
    "Login.aspx": (url, init) =>
      init?.method === "POST"
        ? new Response("<script>alert('Usuario o clave incorrectos');</script>")
        : new Response(PAGINA_LOGIN),
  })

  await expect(login("27123456789", "mala")).rejects.toThrow(
    "Usuario o clave incorrectos"
  )
})

test("el login corta si el usuario no tiene ninguna empresa en Repuestos", async () => {
  loginHandler({ GetEmpresas: () => json({ d: null }) })

  await expect(login("27123456789", "clave")).rejects.toThrow(
    "Orion no devolvio ninguna empresa para este usuario"
  )
})

test("el login corta si la sesion del subsistema no quedo abierta", async () => {
  loginHandler({ getUserLog: () => json({ d: {} }) })

  await expect(login("27123456789", "clave")).rejects.toThrow(
    "La sesion de Orion no quedo abierta"
  )
})

test("un WebMethod que falla informa el status, la url y el detalle", async () => {
  loginHandler({
    GetEmpresas: () => new Response("System.NullReferenceException", { status: 500 }),
  })

  await expect(login("27123456789", "clave")).rejects.toThrow(
    /Orion respondio 500 en .*GetEmpresas: System.NullReferenceException/
  )
})

test("si ni el cuerpo del error se puede leer, igual informa el status", async () => {
  loginHandler({
    GetEmpresas: () =>
      ({
        ok: false,
        status: 503,
        headers: new Headers(),
        text: () => Promise.reject(new Error("conexion cortada")),
      }) as unknown as Response,
  })

  await expect(login("27123456789", "clave")).rejects.toThrow(/Orion respondio 503 .*: $/)
})

test("una cadena infinita de redirects corta en vez de colgarse", async () => {
  mockFetch(
    () =>
      new Response(null, { status: 302, headers: { location: "/portal/vuelta" } })
  )

  await expect(login("27123456789", "clave")).rejects.toThrow(
    "Demasiados redirects en Orion"
  )
})

const fila = (id: number, fechaPedido: string | null = "/Date(1790277420000)/") => ({
  idCotizacion: id,
  idCotizacionEncrypt: `enc-${id}`,
  nroSiniestro: null,
  compania: null,
  perito: null,
  vehiculo: null,
  patente: null,
  cantPiezas: null,
  tipoAsegurado: "True",
  fechaPedido,
  fechaVencimiento: null,
  Estado: null,
  zona: null,
})

const pagina = (desde: number, cantidad: number, fecha?: string | null) =>
  Array.from({ length: cantidad }, (_, i) =>
    fecha === undefined ? fila(desde + i) : fila(desde + i, fecha)
  )

test("una sola pagina corta el paginado y manda los filtros por defecto", async () => {
  mockFetch(() => json({ d: pagina(1, 3) }))

  const rows = await fetchCotizaciones({ cookie: "c", empresaId: 77 })

  expect(rows).toHaveLength(3)
  // Sin timeout una corrida se cuelga esperando a Orion para siempre.
  expect(llamadas[0].init?.signal).toBeInstanceOf(AbortSignal)
  const enviado = JSON.parse(String(llamadas[0].init?.body)).param
  expect(enviado).toMatchObject({
    estadoCotizacion: NUEVAS,
    condicion: String(ASEGURADO),
    fechaPedidoDesde: "",
    fechaPedidoHasta: "",
    idRepuestero: "77",
    idEmpresaRepuestero: 77,
  })
})

test("con la pagina llena sigue hacia atras y deduplica por id", async () => {
  const paginas = [
    pagina(1, 200),
    // La ultima de la pagina anterior vuelve a venir: la absorbe el Map.
    [fila(200), fila(201)],
  ]
  mockFetch(() => json({ d: paginas.shift() ?? [] }))

  const rows = await fetchCotizaciones({
    cookie: "c",
    empresaId: 77,
    estado: EN_PROCESO,
    condicion: 3,
    desde: "2026-09-28T03:00:00.000Z",
    maxPages: 5,
  })

  expect(rows).toHaveLength(201)
  expect(JSON.parse(String(llamadas[1].init?.body)).param).toMatchObject({
    fechaPedidoHasta: "2026-09-24T19:17:00.000Z",
    fechaPedidoDesde: "2026-09-28T03:00:00.000Z",
    estadoCotizacion: EN_PROCESO,
  })
})

test("corta si la pagina siguiente arranca en la misma fecha que la anterior", async () => {
  mockFetch(() => json({ d: pagina(1, 200) }))

  const rows = await fetchCotizaciones({ cookie: "c", empresaId: 77, maxPages: 9 })

  // Segunda pagina identica: sin corte quedaria pidiendo lo mismo para siempre.
  expect(llamadas).toHaveLength(2)
  expect(rows).toHaveLength(200)
})

test("una fila sin fechaPedido corta el paginado en vez de romper la corrida", async () => {
  mockFetch(() => json({ d: pagina(1, 200, null) }))

  await expect(
    fetchCotizaciones({ cookie: "c", empresaId: 77 })
  ).resolves.toHaveLength(200)
  expect(llamadas).toHaveLength(1)
})

test("la grilla sin cuerpo devuelve lista vacia y con error explota", async () => {
  mockFetch(() => json({}))
  await expect(fetchCotizaciones({ cookie: "c", empresaId: 77 })).resolves.toEqual([])

  mockFetch(() => new Response("timeout", { status: 504 }))
  await expect(fetchCotizaciones({ cookie: "c", empresaId: 77 })).rejects.toThrow(
    "Orion respondio 504 al listar cotizaciones: timeout"
  )

  mockFetch(
    () =>
      ({
        ok: false,
        status: 504,
        text: () => Promise.reject(new Error("conexion cortada")),
      }) as unknown as Response
  )
  await expect(fetchCotizaciones({ cookie: "c", empresaId: 77 })).rejects.toThrow(
    "Orion respondio 504 al listar cotizaciones: "
  )
})

test("sin ids no se le pide nada a Orion", async () => {
  mockFetch(() => new Response("no deberia llamarse"))

  await expect(fetchDetalles({ cookie: "c", encryptedIds: [] })).resolves.toEqual(
    new Map()
  )
  expect(llamadas).toHaveLength(0)
})

test("el detalle que falla no se lleva puestos a los demas", async () => {
  mockFetch((url, init) => {
    // El GET que habilita el controller no devuelve JSON, y no lo miramos.
    if (init?.method !== "POST") return new Response("<html></html>")
    const id = JSON.parse(String(init.body)).idCotizacionEncrypt
    if (id === "roto") return new Response("boom", { status: 500 })
    // Orion contesta 200 con el detalle vacio cuando la cotizacion se cerro.
    if (id === "vacio") return json({})
    return json({ d: { vin: `vin-${id}` } })
  })

  const detalles = await fetchDetalles({
    cookie: "c",
    encryptedIds: ["a", "roto", "vacio", "b"],
  })

  expect([...detalles.keys()]).toEqual(["a", "b"])
  expect(detalles.get("b")?.vin).toEqual("vin-b")
  // La pagina de detalle se abre una sola vez por corrida, no una por pedido.
  const aperturas = llamadas.filter((llamada) =>
    llamada.url.includes("Cotizacion.aspx")
  )
  expect(aperturas).toHaveLength(1)
  expect(aperturas[0].url).toBe(
    "https://www.sistema-orion.com/Repuestos/Views/Cotizacion.aspx?IdCotiz=a&case=N"
  )
  expect(aperturas[0].init?.headers).toEqual({ Cookie: "c" })
})

test("el detalle informa el status aunque no se pueda leer el cuerpo", async () => {
  mockFetch((url, init) =>
    init?.method === "POST"
      ? (({
          ok: false,
          status: 500,
          text: () => Promise.reject(new Error("conexion cortada")),
        }) as unknown as Response)
      : new Response("<html></html>")
  )

  await expect(
    fetchDetalles({ cookie: "c", encryptedIds: ["a"] })
  ).resolves.toEqual(new Map())
})
