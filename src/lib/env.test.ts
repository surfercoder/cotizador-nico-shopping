/**
 * @jest-environment node
 */
import { env } from "./env"

test("expone las variables publicas validadas", () => {
  expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://proyecto.supabase.co")
  expect(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe("sb_publishable_test")
  expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined()
})

test("falla al arrancar si falta una variable obligatoria", async () => {
  jest.resetModules()
  const urlOriginal = process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_URL

  await expect(import("./env")).rejects.toThrow()

  process.env.NEXT_PUBLIC_SUPABASE_URL = urlOriginal
})
