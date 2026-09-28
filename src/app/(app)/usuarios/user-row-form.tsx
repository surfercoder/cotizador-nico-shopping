"use client"

import { useActionState } from "react"

import { SubmitButton } from "@/components/submit-button"
import { TableCell, TableRow } from "@/components/ui/table"
import { initialActionState } from "@/lib/action-state"
import {
  USER_ROLE_LABELS,
  userRoleSchema,
  type Profile,
} from "@/schemas/profile"

import { updateUserAccess } from "./actions"

export function UserRowForm({
  user,
  isSelf,
}: {
  user: Profile
  isSelf: boolean
}) {
  const [state, formAction] = useActionState(
    updateUserAccess,
    initialActionState
  )

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{user.full_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{user.email}</div>
        {state.message && (
          <div
            className={
              state.ok
                ? "mt-1 text-xs text-muted-foreground"
                : "mt-1 text-xs text-destructive"
            }
          >
            {state.message}
          </div>
        )}
      </TableCell>

      <TableCell colSpan={3}>
        <form
          action={formAction}
          className="flex items-center justify-end gap-3"
        >
          <input type="hidden" name="userId" value={user.id} />

          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            aria-label="Rol"
            className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30"
          >
            {userRoleSchema.options.map((role) => (
              <option key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={user.is_active}
              disabled={isSelf}
              className="size-4 accent-primary"
            />
            Habilitado
          </label>

          <SubmitButton size="sm" variant="outline" disabled={isSelf}>
            Guardar
          </SubmitButton>
        </form>
      </TableCell>
    </TableRow>
  )
}
