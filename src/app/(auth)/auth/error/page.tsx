
import { ButtonLink } from "@/components/button-link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default async function AuthErrorPage({
  searchParams,
}: PageProps<"/auth/error">) {
  const { motivo } = await searchParams

  return (
    <Card>
      <CardHeader>
        <CardTitle>No pudimos validar el link</CardTitle>
        <CardDescription>
          {typeof motivo === "string" && motivo
            ? motivo
            : "El link es invalido o ya vencio."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <ButtonLink href="/login">Volver a ingresar</ButtonLink>
        <ButtonLink href="/recuperar" variant="outline">
          Pedir uno nuevo
        </ButtonLink>
      </CardContent>
    </Card>
  )
}
