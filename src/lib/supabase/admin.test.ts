/**
 * @jest-environment node
 */
const createClient = jest.fn((...args: unknown[]) => `cliente-admin ${args.length}`)
jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => createClient(...args),
}))

import { createAdminClient } from "./admin"

test("crea el cliente con la secret key y sin persistir sesion", () => {
  expect(createAdminClient()).toBe("cliente-admin 3")
  expect(createClient).toHaveBeenCalledWith(
    "https://proyecto.supabase.co",
    "sb_secret_test",
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
})

test("explota si falta la secret key en vez de pegarle a Supabase sin permisos", () => {
  const key = process.env.SUPABASE_SECRET_KEY
  delete process.env.SUPABASE_SECRET_KEY

  expect(createAdminClient).toThrow("Falta SUPABASE_SECRET_KEY")

  process.env.SUPABASE_SECRET_KEY = key
})
