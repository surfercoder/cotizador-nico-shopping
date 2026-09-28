import { requireAuthenticatedProfile } from "@/lib/dal"

import { AppHeader } from "./app-header"

/**
 * Toda pagina bajo este layout exige sesion valida y cuenta habilitada.
 * El chequeo del proxy es solo optimista; el real es este.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireAuthenticatedProfile()

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader profile={profile} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-6">{children}</main>
    </div>
  )
}
