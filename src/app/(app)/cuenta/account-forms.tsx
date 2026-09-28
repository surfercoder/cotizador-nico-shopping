"use client"

import { useActionState } from "react"

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

import { changePassword, updateProfile } from "./actions"

export function ProfileForm({ fullName }: { fullName: string }) {
  const [state, formAction] = useActionState(updateProfile, initialActionState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <Field>
        <FieldLabel htmlFor="full_name">Nombre y apellido</FieldLabel>
        <Input
          // Remonta el input cuando el server devuelve el valor ya guardado,
          // si no Base UI avisa que cambio el defaultValue de un uncontrolled.
          key={fullName}
          id="full_name"
          name="full_name"
          defaultValue={fullName}
          autoComplete="name"
          required
          aria-invalid={Boolean(state.fieldErrors?.full_name)}
        />
        <FieldError>{state.fieldErrors?.full_name?.[0]}</FieldError>
      </Field>

      <SubmitButton className="self-start">Guardar</SubmitButton>
    </form>
  )
}

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialActionState)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="currentPassword">Contrasena actual</FieldLabel>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={Boolean(state.fieldErrors?.currentPassword)}
          />
          <FieldError>{state.fieldErrors?.currentPassword?.[0]}</FieldError>
        </Field>

        <Field>
          <FieldLabel htmlFor="newPassword">Nueva contrasena</FieldLabel>
          <Input
            id="newPassword"
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

      <SubmitButton className="self-start">Cambiar contrasena</SubmitButton>
    </form>
  )
}
