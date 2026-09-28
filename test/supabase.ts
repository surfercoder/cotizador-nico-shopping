/**
 * Doble del cliente de Supabase para los tests de server actions y del sync.
 *
 * El cliente real encadena metodos y recien se resuelve en el await, sin un
 * terminador fijo (`.single()`, `.maybeSingle()`, `.eq()`, o nada). El Proxy
 * graba la cadena y `then` devuelve lo que el test decida para esa consulta,
 * asi no hay que mockear metodo por metodo en cada archivo.
 */
export type Operacion = [string, unknown[]]
export type Consulta = { tabla: string; ops: Operacion[] }
export type Respuesta = { data?: unknown; error?: { message: string } | null }

export const argumentos = (consulta: Consulta | undefined, metodo: string) =>
  consulta?.ops.find(([nombre]) => nombre === metodo)?.[1]

export function crearSupabaseMock() {
  const consultas: Consulta[] = []
  let responder: (consulta: Consulta) => Respuesta = () => ({
    data: null,
    error: null,
  })

  const from = jest.fn((tabla: string) => {
    const consulta: Consulta = { tabla, ops: [] }
    consultas.push(consulta)

    const builder: Record<string, unknown> = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (
              onResuelto: (valor: Respuesta) => unknown,
              onError: (error: unknown) => unknown
            ) => Promise.resolve(responder(consulta)).then(onResuelto, onError)
          }
          return (...args: unknown[]) => {
            consulta.ops.push([String(prop), args])
            return builder
          }
        },
      }
    )

    return builder
  })

  const auth = {
    getUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    updateUser: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  }
  const rpc = jest.fn()

  return {
    supabase: { from, rpc, auth },
    auth,
    rpc,
    consultas,
    /** Ultima consulta que uso ese metodo (update, upsert, insert, delete...). */
    consulta: (metodo: string) =>
      [...consultas].reverse().find((c) => argumentos(c, metodo) !== undefined),
    responde(fn: (consulta: Consulta) => Respuesta) {
      responder = fn
    },
    limpiar() {
      consultas.length = 0
      responder = () => ({ data: null, error: null })
    },
  }
}
