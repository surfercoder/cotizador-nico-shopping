/**
 * @jest-environment node
 */
import {
  profileSchema,
  updateProfileSchema,
  updateUserAccessFormSchema,
  updateUserAccessSchema,
  USER_ROLE_LABELS,
  userRoleSchema,
} from "./profile"

const ID = "33333333-3333-4333-8333-333333333333"

const errores = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? []

test("los roles de la base tienen etiqueta en la UI", () => {
  expect(Object.keys(USER_ROLE_LABELS).sort()).toEqual(
    [...userRoleSchema.options].sort()
  )
  expect(userRoleSchema.safeParse("gerente").success).toBe(false)
})

test("el perfil valida email, rol y fechas", () => {
  const perfil = {
    id: ID,
    email: "nico@shopping.com",
    full_name: "Nico",
    role: "admin" as const,
    is_active: true,
    created_at: "2026-09-01T00:00:00+00:00",
    updated_at: "2026-09-01T00:00:00+00:00",
  }

  expect(profileSchema.parse(perfil)).toEqual(perfil)
  expect(profileSchema.safeParse({ ...perfil, role: "gerente" }).success).toBe(false)
})

test("el usuario solo puede cambiar su nombre, recortado", () => {
  expect(updateProfileSchema.parse({ full_name: "  Nico Shopping " })).toEqual({
    full_name: "Nico Shopping",
  })
  expect(errores(updateProfileSchema.safeParse({ full_name: "N" }))).toContain(
    "Ingresa tu nombre completo."
  )
  expect(
    errores(updateProfileSchema.safeParse({ full_name: "N".repeat(81) }))
  ).toContain("Maximo 80 caracteres.")
})

test("el admin cambia rol y estado, por objeto o por formulario", () => {
  expect(
    updateUserAccessSchema.parse({ userId: ID, role: "supervisor", isActive: false })
  ).toEqual({ userId: ID, role: "supervisor", isActive: false })

  expect(
    updateUserAccessFormSchema.parse({ userId: ID, role: "operador", isActive: "on" })
  ).toEqual({ userId: ID, role: "operador", isActive: true })

  // Checkbox sin marcar: no viaja en el FormData.
  expect(
    updateUserAccessFormSchema.parse({ userId: ID, role: "operador" }).isActive
  ).toBe(false)
})
