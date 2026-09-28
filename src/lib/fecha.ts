/**
 * "El dia de hoy" es el dia habil de Nico Shopping, no el dia UTC: a las 21:30
 * de Mendoza ya seria el dia siguiente en UTC y el listado se vaciaria solo.
 *
 * Argentina esta fija en UTC-3 (no usa horario de verano), asi que el offset va
 * escrito y no hace falta ninguna libreria de zonas.
 *
 * Todo lo que se muestre con fecha u hora sale de aca: los formatters llevan
 * locale y timeZone explicitos, si no el server y el browser formatean distinto
 * y React avisa de un hydration mismatch. Y se construyen una sola vez, porque
 * armar un Intl.DateTimeFormat es caro.
 *
 * Sin imports a proposito: asi se puede probar sin levantar nada.
 */

const ZONA = "America/Argentina/Buenos_Aires"

const formatoISO = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA })

/**
 * hourCycle h23 a mano: es-AR sale en 12 horas ("03:00 p. m.") y Orion muestra
 * "15:00". Las dos grillas se comparan a ojo, asi que la hora tiene que leerse
 * igual en las dos.
 */
const formatoHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const formatoDiaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

const formatoDia = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: ZONA,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

/** "2026-09-28" para el reloj de Argentina. en-CA formatea aaaa-mm-dd. */
export const fechaArgentina = (ahora = new Date()) => formatoISO.format(ahora)

/** Arranque del dia de hoy en Argentina, en ISO, para comparar en Postgres. */
export const inicioDelDiaArgentina = (ahora = new Date()) =>
  new Date(`${fechaArgentina(ahora)}T00:00:00-03:00`).toISOString()

/** "15:30" */
export const horaArgentina = (valor: string | Date) =>
  formatoHora.format(new Date(valor))

/** "24/09 15:30" */
export const diaHoraArgentina = (valor: string | Date) =>
  formatoDiaHora.format(new Date(valor))

/** "28/09/2026" */
export const diaArgentina = (valor: string | Date = new Date()) =>
  formatoDia.format(new Date(valor))

/** "28/09/2026 15:30" */
export const fechaHoraArgentina = (valor: string | Date) =>
  formatoFechaHora.format(new Date(valor))
