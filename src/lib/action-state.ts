import * as z from "zod"

/**
 * Forma unica de respuesta de todas las server actions, pensada para
 * `useActionState`. Nunca devuelve filas crudas de la base: solo lo que la UI
 * necesita renderizar.
 */
export type ActionState = {
  ok?: boolean
  message?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export const initialActionState: ActionState = {}

export const actionError = (
  message: string,
  fieldErrors?: ActionState["fieldErrors"]
): ActionState => ({ ok: false, message, fieldErrors })

export const actionSuccess = (message?: string): ActionState => ({
  ok: true,
  message,
})

/** Valida un FormData contra un schema de zod. */
export function parseFormData<S extends z.ZodType>(
  schema: S,
  formData: FormData
):
  | { success: true; data: z.infer<S> }
  | { success: false; state: ActionState } {
  const raw = Object.fromEntries(formData.entries())
  const result = schema.safeParse(raw)

  if (!result.success) {
    return {
      success: false,
      state: actionError(
        "Revisa los datos ingresados.",
        z.flattenError(result.error).fieldErrors as ActionState["fieldErrors"]
      ),
    }
  }

  return { success: true, data: result.data }
}
