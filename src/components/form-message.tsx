import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionState } from "@/lib/action-state"

/** Mensaje global de una server action (no los errores por campo). */
export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null

  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}
