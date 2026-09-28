import type { Metadata } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { UpdatePasswordForm } from "./update-password-form"

export const metadata: Metadata = { title: "Nueva contrasena" }

export default function UpdatePasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva contrasena</CardTitle>
        <CardDescription>
          Elegi la contrasena con la que vas a ingresar de ahora en mas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <UpdatePasswordForm />
      </CardContent>
    </Card>
  )
}
