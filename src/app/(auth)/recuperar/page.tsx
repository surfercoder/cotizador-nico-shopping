import type { Metadata } from "next"
import Link from "next/link"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ForgotPasswordForm } from "./forgot-password-form"

export const metadata: Metadata = { title: "Recuperar contrasena" }

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar contrasena</CardTitle>
        <CardDescription>
          Te mandamos un link por email para elegir una nueva.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <Link href="/login" className="underline underline-offset-4">
          Volver a ingresar
        </Link>
      </CardFooter>
    </Card>
  )
}
