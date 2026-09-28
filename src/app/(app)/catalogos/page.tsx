import type { Metadata } from "next"

import { requireRole } from "@/lib/dal"
import { createClient } from "@/lib/supabase/server"
import {
  BRAND_SUGGESTIONS,
  type CatalogCredentialStatus,
} from "@/schemas/catalog"

import { BrandSuggestions, CatalogCard, NewCatalogForm } from "./catalog-forms"

export const metadata: Metadata = { title: "Catalogos" }

export default async function CatalogsPage() {
  await requireRole("admin")

  const supabase = await createClient()
  const [{ data: catalogs }, { data: credentials }] = await Promise.all([
    supabase.from("catalogs").select("*").order("name"),
    // Igual que en plataformas: esta funcion devuelve usuario y fecha, nunca
    // la password.
    supabase.rpc("catalog_credentials_status"),
  ])

  const statusByCatalog = new Map<string, CatalogCredentialStatus>(
    ((credentials ?? []) as CatalogCredentialStatus[]).map((row) => [
      row.catalog_id,
      row,
    ])
  )

  const brandOptions = [
    ...new Set([
      ...BRAND_SUGGESTIONS,
      ...(catalogs ?? []).flatMap((catalog) => catalog.brands),
    ]),
  ].sort()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catalogos</h1>
        <p className="text-sm text-muted-foreground">
          Catalogos de repuestos y accesorios. Cada uno cubre una o varias
          marcas; los que no tienen marcas son multimarca y sirven de respaldo
          cuando no hay disponibilidad.
        </p>
      </div>

      <BrandSuggestions brands={brandOptions} />

      <NewCatalogForm />

      <div className="flex flex-col gap-4">
        {(catalogs ?? []).map((catalog) => (
          <CatalogCard
            key={catalog.id}
            catalog={catalog}
            credential={statusByCatalog.get(catalog.id) ?? null}
          />
        ))}

        {catalogs?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavia no hay catalogos cargados.
          </p>
        )}
      </div>
    </div>
  )
}
