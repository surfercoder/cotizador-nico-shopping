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

import { SignupForm } from "./signup-form"

export const metadata: Metadata = { title: "Crear cuenta" }

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear cuenta</CardTitle>
        <CardDescription>
          Un administrador tiene que habilitarte antes de que puedas operar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Ya tenes cuenta?
        <Link href="/login" className="ml-1 underline underline-offset-4">
          Ingresar
        </Link>
      </CardFooter>
    </Card>
  )
}
