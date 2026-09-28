/**
 * Unico lugar donde se decide a donde puede volver el usuario despues de
 * loguearse o de abrir un link de email.
 *
 * Es una allowlist y no un "empieza con /": la funcion devuelve siempre una de
 * las constantes de abajo, nunca el texto que vino en la URL, asi no hay forma
 * de armar un open redirect ni de encadenar a una pantalla privilegiada con un
 * valor raro ("//evil.com", "/\\evil.com", "/login?next=...").
 */
const RUTAS_INTERNAS = [
  "/",
  "/catalogos",
  "/cuenta",
  "/plataformas",
  "/usuarios",
  "/actualizar-password",
  "/sin-permisos",
] as const

export type RutaValida = (typeof RUTAS_INTERNAS)[number]

/** Devuelve la ruta pedida si esta en la allowlist; si no, `undefined`. */
export function rutaValida(valor: unknown): RutaValida | undefined {
  return RUTAS_INTERNAS.find((ruta) => ruta === valor)
}
