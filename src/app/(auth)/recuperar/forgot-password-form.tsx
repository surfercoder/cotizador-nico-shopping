"use client"

import { useActionState } from "react"

import { requestPasswordReset } from "@/app/(auth)/actions"
import { FormMessage } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { initialActionState } from "@/lib/action-state"

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(
    requestPasswordReset,
    initialActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError>{state.fieldErrors?.email?.[0]}</FieldError>
      </Field>

      <SubmitButton className="w-full">Enviar link</SubmitButton>
    </form>
  )
}
