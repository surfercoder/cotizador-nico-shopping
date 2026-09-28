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
import {
  formatBrand,
  type Catalog,
  type CatalogCredentialStatus,
} from "@/schemas/catalog"

import {
  createCatalog,
  deleteCatalog,
  saveCatalogCredentials,
  updateCatalog,
} from "./actions"

/** Las marcas se escriben separadas por coma; el schema las normaliza. */
const BRAND_LIST_ID = "brand-suggestions"

export function NewCatalogForm() {
  const [state, formAction] = useActionState(createCatalog, initialActionState)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo catalogo</CardTitle>
        <CardDescription>
          El identificador es la llave con la que el sistema lo reconoce y no se
          puede cambiar despues. Sin marcas queda como multimarca.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <FormMessage state={state} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="new-catalog-name">Nombre</FieldLabel>
              <Input
                id="new-catalog-name"
                name="name"
                placeholder="Service Box"
                required
                aria-invalid={Boolean(state.fieldErrors?.name)}
              />
              <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-catalog-slug">Identificador</FieldLabel>
              <Input
                id="new-catalog-slug"
                name="slug"
                placeholder="servicebox"
                required
                aria-invalid={Boolean(state.fieldErrors?.slug)}
              />
              <FieldError>{state.fieldErrors?.slug?.[0]}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="new-catalog-url">URL</FieldLabel>
              <Input
                id="new-catalog-url"
                name="url"
                type="url"
                placeholder="https://..."
                required
                aria-invalid={Boolean(state.fieldErrors?.url)}
              />
              <FieldError>{state.fieldErrors?.url?.[0]}</FieldError>
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="new-catalog-brands">
                Marcas que cubre
              </FieldLabel>
              <Input
                id="new-catalog-brands"
                name="brands"
                list={BRAND_LIST_ID}
                placeholder="peugeot, citroen (vacio = multimarca)"
              />
            </Field>

            <label className="flex h-9 items-end gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                name="requiresAuth"
                className="size-4 accent-primary"
              />
              Necesita usuario y clave
            </label>
          </div>

          <Field>
            <FieldLabel htmlFor="new-catalog-notes">Notas</FieldLabel>
            <Input
              id="new-catalog-notes"
              name="notes"
              placeholder="Para que se usa, limitaciones, etc."
            />
            <FieldError>{state.fieldErrors?.notes?.[0]}</FieldError>
          </Field>

          <SubmitButton className="self-start">Agregar</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}

export function CatalogCard({
  catalog,
  credential,
}: {
  catalog: Catalog
  credential: CatalogCredentialStatus | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{catalog.name}</CardTitle>
        <CardDescription>
          <a
            href={catalog.url}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            {catalog.url}
          </a>
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant={catalog.is_active ? "default" : "secondary"}>
            {catalog.is_active ? "Activo" : "Pausado"}
          </Badge>
          {catalog.brands.length === 0 ? (
            <Badge variant="outline">Multimarca</Badge>
          ) : (
            catalog.brands.map((brand) => (
              <Badge key={brand} variant="outline">
                {formatBrand(brand)}
              </Badge>
            ))
          )}
          {catalog.requires_auth && (
            <Badge variant={credential ? "secondary" : "destructive"}>
              {credential ? "Con credenciales" : "Sin credenciales"}
            </Badge>
          )}
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <CatalogDetailsForm catalog={catalog} />

        {catalog.requires_auth && (
          <>
            <Separator />
            <CatalogCredentialsForm
              catalogId={catalog.id}
              credential={credential}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CatalogDetailsForm({ catalog }: { catalog: Catalog }) {
  const [state, formAction] = useActionState(updateCatalog, initialActionState)
  const [deleteState, deleteAction] = useActionState(
    deleteCatalog,
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
          <input type="hidden" name="catalogId" value={catalog.id} />

          <Field className="min-w-40 flex-1">
            <FieldLabel htmlFor={`catalog-name-${catalog.id}`}>
              Nombre
            </FieldLabel>
            <Input
              key={catalog.name}
              id={`catalog-name-${catalog.id}`}
              name="name"
              defaultValue={catalog.name}
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
            <FieldError>{state.fieldErrors?.name?.[0]}</FieldError>
          </Field>

          <Field className="min-w-60 flex-2">
            <FieldLabel htmlFor={`catalog-url-${catalog.id}`}>URL</FieldLabel>
            <Input
              key={catalog.url}
              id={`catalog-url-${catalog.id}`}
              name="url"
              type="url"
              defaultValue={catalog.url}
              required
              aria-invalid={Boolean(state.fieldErrors?.url)}
            />
            <FieldError>{state.fieldErrors?.url?.[0]}</FieldError>
          </Field>

          <Field className="min-w-60 flex-1">
            <FieldLabel htmlFor={`catalog-brands-${catalog.id}`}>
              Marcas (vacio = multimarca)
            </FieldLabel>
            <Input
              key={catalog.brands.join(",")}
              id={`catalog-brands-${catalog.id}`}
              name="brands"
              list={BRAND_LIST_ID}
              defaultValue={catalog.brands.join(", ")}
            />
          </Field>

          <Field className="min-w-60 flex-2">
            <FieldLabel htmlFor={`catalog-notes-${catalog.id}`}>
              Notas
            </FieldLabel>
            <Input
              key={catalog.notes ?? ""}
              id={`catalog-notes-${catalog.id}`}
              name="notes"
              defaultValue={catalog.notes ?? ""}
            />
            <FieldError>{state.fieldErrors?.notes?.[0]}</FieldError>
          </Field>

          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="requiresAuth"
              defaultChecked={catalog.requires_auth}
              className="size-4 accent-primary"
            />
            Con credenciales
          </label>

          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={catalog.is_active}
              className="size-4 accent-primary"
            />
            Activo
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
                `Eliminar "${catalog.name}"? Tambien se borran sus credenciales.`
              )
            ) {
              event.preventDefault()
            }
          }}
        >
          <input type="hidden" name="catalogId" value={catalog.id} />
          <SubmitButton size="sm" variant="ghost" className="text-destructive">
            Eliminar
          </SubmitButton>
        </form>
      </div>
    </div>
  )
}

function CatalogCredentialsForm({
  catalogId,
  credential,
}: {
  catalogId: string
  credential: CatalogCredentialStatus | null
}) {
  const [state, formAction] = useActionState(
    saveCatalogCredentials,
    initialActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />

      <div className="flex flex-wrap items-end gap-4">
        <input type="hidden" name="catalogId" value={catalogId} />

        <Field className="min-w-40 flex-1">
          <FieldLabel htmlFor={`catalog-user-${catalogId}`}>
            Usuario del catalogo
          </FieldLabel>
          <Input
            key={credential?.username ?? ""}
            id={`catalog-user-${catalogId}`}
            name="username"
            defaultValue={credential?.username ?? ""}
            autoComplete="off"
            required
            aria-invalid={Boolean(state.fieldErrors?.username)}
          />
          <FieldError>{state.fieldErrors?.username?.[0]}</FieldError>
        </Field>

        <Field className="min-w-40 flex-1">
          <FieldLabel htmlFor={`catalog-pass-${catalogId}`}>
            Contrasena
          </FieldLabel>
          <Input
            id={`catalog-pass-${catalogId}`}
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

/** Sugerencias compartidas por todos los inputs de marcas. */
export function BrandSuggestions({ brands }: { brands: string[] }) {
  return (
    <datalist id={BRAND_LIST_ID}>
      {brands.map((brand) => (
        <option key={brand} value={brand} />
      ))}
    </datalist>
  )
}
