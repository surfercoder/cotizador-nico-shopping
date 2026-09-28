/**
 * @jest-environment node
 */
import {
  createPlatformSchema,
  deletePlatformSchema,
  platformCredentialsSchema,
  platformSchema,
  syncPlatformSchema,
  updatePlatformFormSchema,
} from "./platform"

const ID = "22222222-2222-4222-8222-222222222222"

const errores = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? []

const fila = {
  id: ID,
  slug: "orion",
  name: "Orion",
  login_url: "https://orion.com/login",
  is_active: true,
  last_sync_at: null,
  last_sync_error: null,
  created_at: "2026-09-01T00:00:00+00:00",
  updated_at: "2026-09-01T00:00:00+00:00",
}

test("la fila de la base valida con fechas con offset y nulos", () => {
  expect(platformSchema.parse(fila)).toEqual(fila)
  expect(
    platformSchema.safeParse({ ...fila, last_sync_at: "2026-09-01" }).success
  ).toBe(false)
})

test("el alta normaliza el slug y valida nombre y url", () => {
  expect(
    createPlatformSchema.parse({
      name: "  Orion  ",
      slug: " ORION ",
      login_url: "https://orion.com/login",
    })
  ).toEqual({ name: "Orion", slug: "orion", login_url: "https://orion.com/login" })

  expect(
    errores(createPlatformSchema.safeParse({ name: "O", slug: "o", login_url: "x" }))
  ).toEqual(
    expect.arrayContaining([
      "Ingresa el nombre de la plataforma.",
      "Ingresa un identificador.",
      "Ingresa la URL de login completa.",
    ])
  )

  expect(
    errores(
      createPlatformSchema.safeParse({
        name: "N".repeat(61),
        slug: "s".repeat(31),
        login_url: "https://orion.com",
      })
    )
  ).toEqual(
    expect.arrayContaining(["Maximo 60 caracteres.", "Maximo 30 caracteres."])
  )

  expect(
    errores(
      createPlatformSchema.safeParse({
        name: "Orion",
        slug: "con espacios",
        login_url: "https://orion.com",
      })
    )
  ).toContain("Solo minusculas, numeros y guiones.")
})

test("la edicion resuelve el checkbox de activo", () => {
  const base = { platformId: ID, name: "Orion", login_url: "https://orion.com" }

  expect(updatePlatformFormSchema.parse({ ...base, isActive: "on" }).isActive).toBe(true)
  expect(updatePlatformFormSchema.parse(base).isActive).toBe(false)
})

test("borrar, sincronizar y credenciales exigen un id valido", () => {
  expect(deletePlatformSchema.parse({ platformId: ID })).toEqual({ platformId: ID })
  expect(syncPlatformSchema.parse({ platformId: ID })).toEqual({ platformId: ID })
  expect(syncPlatformSchema.safeParse({ platformId: "1" }).success).toBe(false)

  expect(
    platformCredentialsSchema.parse({
      platformId: ID,
      username: "  nico  ",
      password: "secreta",
    })
  ).toEqual({ platformId: ID, username: "nico", password: "secreta" })

  expect(
    errores(
      platformCredentialsSchema.safeParse({ platformId: ID, username: "", password: "" })
    )
  ).toEqual(
    expect.arrayContaining([
      "Ingresa el usuario de la plataforma.",
      "Ingresa la contrasena.",
    ])
  )

  expect(
    errores(
      platformCredentialsSchema.safeParse({
        platformId: ID,
        username: "u".repeat(121),
        password: "p".repeat(201),
      })
    )
  ).toEqual(
    expect.arrayContaining(["Maximo 120 caracteres.", "Maximo 200 caracteres."])
  )
})
