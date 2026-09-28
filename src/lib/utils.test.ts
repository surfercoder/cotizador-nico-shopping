/**
 * @jest-environment node
 */
import { cn } from "./utils"

test("cn junta clases y descarta las falsas", () => {
  expect(cn("a", false && "b", undefined, "c")).toBe("a c")
})
