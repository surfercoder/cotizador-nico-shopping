import { normalizeBrand, type Catalog } from "@/schemas/catalog"

/**
 * El catalogo donde se busca un vehiculo: el primero activo que tenga su
 * marca. Orion manda la marca como primera palabra de `vehiculo`
 * ("TOYOTA HILUX", "CITROEN C 4").
 */
export function catalogoDelVehiculo(
  catalogos: Catalog[],
  vehiculo: string | null
): Catalog | null {
  const marca = normalizeBrand(vehiculo?.split(" ")[0] ?? "")
  if (!marca) return null

  return (
    catalogos.find(
      (catalogo) => catalogo.is_active && catalogo.brands.includes(marca)
    ) ?? null
  )
}

/**
 * El codigo del fabricante tal como lo indexan los catalogos: sin guiones ni
 * espacios. Los que inventa Orion (`SCOD...` / `PSCOD...`) no existen en
 * ningun catalogo y devuelven null.
 *
 * Toyota agrega dos caracteres de color al final ("52119-0K021-00",
 * "73970-0K020-B0"); el numero de parte son los primeros diez.
 */
export function codigoDeFabricante(codigo: string | null | undefined) {
  const limpio = (codigo ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase()
  if (!limpio || /^P?SCOD/.test(limpio)) return null
  if (/^\d{5}[0-9A-Z]{7}$/.test(limpio)) return limpio.slice(0, 10)
  return limpio
}

/**
 * Link para que el operador busque la pieza en el catalogo. PartSouq acepta
 * el codigo en la URL; los demas abren en el inicio del catalogo, igual que
 * cuando no hay codigo de fabricante.
 *
 * ponytail: es un link y no una consulta automatica porque PartSouq bloquea
 * los pedidos que no vienen de un navegador (Cloudflare). Si consiguen acceso
 * por API, la busqueda se hace del lado del servidor y esto queda de respaldo.
 */
export function enlaceDeBusqueda(catalogo: Catalog, codigo: string | null) {
  if (catalogo.slug === "partsouq" && codigo) {
    return `https://partsouq.com/en/search/all?q=${encodeURIComponent(codigo)}`
  }
  return catalogo.url
}
