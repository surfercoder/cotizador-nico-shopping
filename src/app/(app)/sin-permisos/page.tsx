import type { Metadata } from "next"

import { ButtonLink } from "@/components/button-link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Sin permisos" }

export default function ForbiddenPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>No tenes permisos</CardTitle>
        <CardDescription>
          Tu rol no habilita esta seccion. Pedile acceso a un administrador.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ButtonLink href="/" variant="outline">
          Volver al panel
        </ButtonLink>
      </CardContent>
    </Card>
  )
}
