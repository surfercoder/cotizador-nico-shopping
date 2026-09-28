"use client"

import { useActionState } from "react"

import { updatePassword } from "@/app/(auth)/actions"
import { FormMessage } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { initialActionState } from "@/lib/action-state"

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(
    updatePassword,
    initialActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">Nueva contrasena</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          <FieldDescription>
            Minimo 8 caracteres, con letras y numeros.
          </FieldDescription>
          <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="confirmPassword">Repetir contrasena</FieldLabel>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
          />
          <FieldError>{state.fieldErrors?.confirmPassword?.[0]}</FieldError>
        </Field>
      </FieldGroup>

      <SubmitButton className="w-full">Guardar contrasena</SubmitButton>
    </form>
  )
}
