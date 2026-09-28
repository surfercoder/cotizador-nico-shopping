import type { Metadata } from "next"

import { requireRole } from "@/lib/dal"
import { createClient } from "@/lib/supabase/server"
import type { PlatformCredentialStatus } from "@/schemas/platform"

import { NewPlatformForm, PlatformCard } from "./platform-forms"

export const metadata: Metadata = { title: "Plataformas" }

export default async function PlatformsPage() {
  await requireRole("admin")

  const supabase = await createClient()
  const [{ data: platforms }, { data: credentials }] = await Promise.all([
    supabase.from("platforms").select("*").order("name"),
    // La tabla de credenciales no se puede leer por API: esta funcion devuelve
    // solo usuario y fecha, nunca la password.
    supabase.rpc("platform_credentials_status"),
  ])

  const statusByPlatform = new Map<string, PlatformCredentialStatus>(
    ((credentials ?? []) as PlatformCredentialStatus[]).map((row) => [
      row.platform_id,
      row,
    ])
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Plataformas</h1>
        <p className="text-sm text-muted-foreground">
          Fuentes de cotizacion. Las contrasenas se guardan cifradas y no se
          pueden volver a ver desde aca: solo reemplazar.
        </p>
      </div>

      <NewPlatformForm />

      <div className="flex flex-col gap-4">
        {(platforms ?? []).map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            credential={statusByPlatform.get(platform.id) ?? null}
          />
        ))}

        {platforms?.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Todavia no hay plataformas cargadas.
          </p>
        )}
      </div>
    </div>
  )
}
