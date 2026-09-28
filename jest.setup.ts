import "@testing-library/jest-dom"

// Valores fijos para que los tests no dependan del .env.local de cada maquina.
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proyecto.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test"
process.env.SUPABASE_SECRET_KEY = "sb_secret_test"
process.env.CRON_SECRET = "cron-test"
delete process.env.NEXT_PUBLIC_SITE_URL

// jsdom no implementa matchMedia y los componentes que miran el tema del
// sistema (sonner, next-themes) lo llaman al montarse. En los tests de server
// (entorno node) no hay window y no hace falta.
if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}
