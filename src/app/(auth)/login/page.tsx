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

import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Ingresar" }

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { next } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresar</CardTitle>
        <CardDescription>Accede con tu cuenta del sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm next={typeof next === "string" ? next : undefined} />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        No tenes cuenta?
        <Link href="/registro" className="ml-1 underline underline-offset-4">
          Crear una
        </Link>
      </CardFooter>
    </Card>
  )
}
