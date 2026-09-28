/**
 * @jest-environment node
 */
import { fechaArgentina, inicioDelDiaArgentina } from "./fecha"

test("el dia se corta a la medianoche de Argentina, no a la de UTC", () => {
  // 28/09 21:30 de Mendoza: en UTC ya es el 29, y aca tiene que seguir siendo 28.
  const nocheDeAca = new Date("2026-09-29T00:30:00Z")
  expect(fechaArgentina(nocheDeAca)).toBe("2026-09-28")
  expect(inicioDelDiaArgentina(nocheDeAca)).toBe("2026-09-28T03:00:00.000Z")

  // Y a las 00:30 de Argentina ya arranco el dia nuevo.
  const madrugada = new Date("2026-09-29T03:30:00Z")
  expect(fechaArgentina(madrugada)).toBe("2026-09-29")
  expect(inicioDelDiaArgentina(madrugada)).toBe("2026-09-29T03:00:00.000Z")
})

test("sin argumento usa el reloj de ahora", () => {
  const ahora = new Date()

  expect(fechaArgentina()).toBe(fechaArgentina(ahora))
  expect(inicioDelDiaArgentina()).toBe(inicioDelDiaArgentina(ahora))
})
