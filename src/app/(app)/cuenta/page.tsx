import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { requireAuthenticatedProfile } from "@/lib/dal"
import { USER_ROLE_LABELS } from "@/schemas/profile"

import { ChangePasswordForm, ProfileForm } from "./account-forms"

export const metadata: Metadata = { title: "Mi cuenta" }

export default async function AccountPage() {
  const profile = await requireAuthenticatedProfile()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
        <p className="text-sm text-muted-foreground">
          {profile.email} &middot; {USER_ROLE_LABELS[profile.role]}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>
            El email y el rol solo los cambia un administrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={profile.full_name} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>
            Para cambiarla necesitas la contrasena actual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
