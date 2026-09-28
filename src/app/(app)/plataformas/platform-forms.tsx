"use client"

import { useActionState } from "react"

import { FormMessage } from "@/components/form-message"
import { SubmitButton } from "@/components/submit-button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { initialActionState } from "@/lib/action-state"
import { fechaHoraArgentina } from "@/lib/fecha"
import type { Platform, PlatformCredentialStatus } from "@/schemas/platform"

import {
  createPlatform,
  deletePlatform,
  savePlatformCredentials,
  syncPlatformNow,
  updatePlatform,
} from "./actions"

export function NewPlatformForm() {
  const [state, formAction] = useActionState(createPlatform, initialActionState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva plataforma</CardTitle>
        <CardDescription>
          El identificador es la llave con la que el sistema la reconoce y no se
          puede cambiar despues.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <FormMessage state={state} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="new-name">Nombre</FieldLabel>
              <Input
                id="new-name"
                name="name"
                placeholder="Sistema Orion"
                required
                aria-invalid={Boolean(state.fieldErrors?.name)}
              />
              <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-slug">Identificador</FieldLabel>
              <Input
                id="new-slug"
                name="slug"
                placeholder="orion"
                required
                aria-invalid={Boolean(state.fieldErrors?.slug)}
              />
              <FieldError>{state.fieldErrors?.slug?.[0]}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-login-url">URL de login</FieldLabel>
              <Input
                id="new-login-url"
                name="login_url"
                type="url"
                placeholder="https://..."
                required
                aria-invalid={Boolean(state.fieldErrors?.login_url)}
              />
              <FieldError>{state.fieldErrors?.login_url?.[0]}</FieldError>
            </Field>
          </div>

          <SubmitButton className="self-start">Agregar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function PlatformCard({
  platform,
  credential,
}: {
  platform: Platform
  credential: PlatformCredentialStatus | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{platform.name}</CardTitle>
        <CardDescription>{platform.slug}</CardDescription>
        <CardAction className="flex gap-2">
          <Badge variant={platform.is_active ? "default" : "secondary"}>
            {platform.is_active ? "Activa" : "Pausada"}
          </Badge>
          <Badge variant={credential ? "secondary" : "destructive"}>
            {credential ? "Con credenciales" : "Sin credenciales"}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <PlatformDetailsForm platform={platform} />
        <Separator />
        <PlatformCredentialsForm
          platformId={platform.id}
          credential={credential}
        />
        <Separator />
        <PlatformSyncForm platform={platform} />
      </CardContent>
    </Card>
  )
}

function PlatformDetailsForm({ platform }: { platform: Platform }) {
  const [state, formAction] = useActionState(updatePlatform, initialActionState)
  const [deleteState, deleteAction] = useActionState(
    deletePlatform,
    initialActionState
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Separados a proposito: el "guardado" de recien no puede tapar un
          error al eliminar. */}
      <FormMessage state={state} />
      <FormMessage state={deleteState} />

      <div className="flex flex-wrap items-end gap-4">
        <form
          action={formAction}
          className="flex flex-1 flex-wrap items-end gap-4"
        >
          <input type="hidden" name="platformId" value={platform.id} />

          <Field className="min-w-40 flex-1">
            <FieldLabel htmlFor={`name-${platform.id}`}>Nombre</FieldLabel>
            <Input
              key={platform.name}
              id={`name-${platform.id}`}
              name="name"
              defaultValue={platform.name}
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
            <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
          </Field>

          <Field className="min-w-60 flex-2">
            <FieldLabel htmlFor={`url-${platform.id}`}>URL de login</FieldLabel>
            <Input
              key={platform.login_url}
              id={`url-${platform.id}`}
              name="login_url"
              type="url"
              defaultValue={platform.login_url}
              required
              aria-invalid={Boolean(state.fieldErrors?.login_url)}
            />
            <FieldError>{state.fieldErrors?.login_url?.[0]}</FieldError>
          </Field>

          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={platform.is_active}
              className="size-4 accent-primary"
            />
            Activa
          </label>

          <SubmitButton size="sm" variant="outline">
            Guardar
          </SubmitButton>
        </form>

        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (
              !confirm(
                `Eliminar "${platform.name}"? Tambien se borran sus credenciales.`
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="platformId" value={platform.id} />
          <SubmitButton size="sm" variant="ghost" className="text-destructive">
            Eliminar
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}

function PlatformCredentialsForm({
  platformId,
  credential,
}: {
  platformId: string
  credential: PlatformCredentialStatus | null
}) {
  const [state, formAction] = useActionState(
    savePlatformCredentials,
    initialActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <div className="flex flex-wrap items-end gap-4">
        <input type="hidden" name="platformId" value={platformId} />

        <Field className="min-w-40 flex-1">
          <FieldLabel htmlFor={`user-${platformId}`}>
            Usuario de la plataforma
          </FieldLabel>
          <Input
            key={credential?.username ?? ""}
            id={`user-${platformId}`}
            name="username"
            defaultValue={credential?.username ?? ""}
            autoComplete="off"
            required
            aria-invalid={Boolean(state.fieldErrors?.username)}
          />
          <FieldError>{state.fieldErrors?.username?.[0]}</FieldError>
        </Field>

        <Field className="min-w-40 flex-1">
          <FieldLabel htmlFor={`pass-${platformId}`}>Contrasena</FieldLabel>
          <Input
            id={`pass-${platformId}`}
            name="password"
            type="password"
            placeholder={credential ? "••••••••" : "Sin cargar"}
            autoComplete="off"
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
          />
          <FieldError>{state.fieldErrors?.password?.[0]}</FieldError>
        </Field>

        <SubmitButton size="sm" variant="outline">
          {credential ? "Reemplazar" : "Guardar"}
        </SubmitButton>
      </div>

      {credential && (
        <p className="text-xs text-muted-foreground">
          Ultima actualizacion: {fechaHoraArgentina(credential.updated_at)}
        </p>
      )}
    </form>
  )
}

function PlatformSyncForm({ platform }: { platform: Platform }) {
  const [state, formAction] = useActionState(
    syncPlatformNow,
    initialActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />

      <div className="flex flex-wrap items-center gap-4">
        <input type="hidden" name="platformId" value={platform.id} />

        <SubmitButton size="sm" variant="outline">
          Sincronizar ahora
        </SubmitButton>

        <div className="text-xs text-muted-foreground">
          {platform.last_sync_at
            ? `Ultima sincronizacion: ${fechaHoraArgentina(platform.last_sync_at)}`
            : "Todavia no se sincronizo nunca."}
        </div>
      </div>

      {platform.last_sync_error && (
        <p className="text-xs text-destructive">
          Ultimo error: {platform.last_sync_error}
        </p>
      )}
    </form>
  )
}
