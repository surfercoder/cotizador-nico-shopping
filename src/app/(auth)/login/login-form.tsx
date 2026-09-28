"use client"

import Link from "next/link"
import { useActionState } from "react"

import { login } from "@/app/(auth)/actions"
import { FormMessage } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { initialActionState } from "@/lib/action-state"

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(login, initialActionState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      {next && <input type="hidden" name="next" value={next} />}

      <FieldGroup>
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

        <Field>
          <FieldLabel htmlFor="password">Contrasena</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
        </Field>
      </FieldGroup>

      <SubmitButton className="w-full">Ingresar</SubmitButton>

      <Link
        href="/recuperar"
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Olvide mi contrasena
      </Link>
    </form>
  )
}
