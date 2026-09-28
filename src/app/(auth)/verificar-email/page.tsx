import type { Metadata } from "next"

import { ButtonLink } from "@/components/button-link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = { title: "Confirma tu email" }

export default function VerifyEmailPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirma tu email</CardTitle>
        <CardDescription>
          Te enviamos un link de confirmacion. Abrilo desde este mismo navegador
          para activar la cuenta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ButtonLink href="/login" variant="outline">
          Volver a ingresar
        </ButtonLink>
      </CardContent>
    </Card>
  )
}
