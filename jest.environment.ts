import JsdomEnvironment from "jest-environment-jsdom"

/**
 * jsdom no implementa las APIs web que Next da por sentadas (fetch y amigos),
 * asi que se copian las de Node al contexto del test. Sin esto cualquier
 * componente que importe `next/cache` explota al importarse.
 *
 * No se copian MessageChannel ni MessagePort: el scheduler de React usa el de
 * jsdom y con el de Node los tests quedan colgados.
 */
const GLOBALES_DE_NODE = [
  "fetch",
  "Request",
  "Response",
  "Headers",
  "TextEncoder",
  "TextDecoder",
] as const

export default class NextJsdomEnvironment extends JsdomEnvironment {
  constructor(...args: ConstructorParameters<typeof JsdomEnvironment>) {
    super(...args)

    for (const nombre of GLOBALES_DE_NODE) {
      if (!(nombre in this.global)) {
        Object.defineProperty(this.global, nombre, {
          configurable: true,
          writable: true,
          value: globalThis[nombre],
        })
      }
    }
  }
}
