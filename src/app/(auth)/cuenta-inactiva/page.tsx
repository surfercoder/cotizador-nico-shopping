import type { Metadata } from "next"

import { logout } from "@/app/(auth)/actions"
import { SubmitButton } from "@/components/submit-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getProfile } from "@/lib/dal"

export const metadata: Metadata = { title: "Cuenta pendiente" }

export default async function InactiveAccountPage() {
  const profile = await getProfile()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuenta pendiente de habilitacion</CardTitle>
        <CardDescription>
          {profile?.email
            ? `La cuenta ${profile.email} existe pero todavia no fue habilitada.`
            : "Tu cuenta todavia no fue habilitada."}{" "}
          Pedile a un administrador que te active.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={logout}>
          <SubmitButton variant="outline">Cerrar sesion</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}
