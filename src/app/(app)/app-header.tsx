import Link from "next/link"

import { logout } from "@/app/(auth)/actions"
import { ButtonLink } from "@/components/button-link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { USER_ROLE_LABELS, type Profile } from "@/schemas/profile"

const NAV = [
  { href: "/", label: "Cotizaciones" },
  { href: "/cuenta", label: "Mi cuenta" },
] as const

export function AppHeader({ profile }: { profile: Profile }) {
  const initials =
    profile.full_name
      .split(" ")
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || profile.email[0]?.toUpperCase()

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-6 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          Cotizador
        </Link>

        <Separator orientation="vertical" className="h-5" />

        <nav className="flex items-center gap-1">
          {NAV.map((item) => (
            <ButtonLink
              key={item.href}
              href={item.href}
              variant="ghost"
              size="sm"
            >
              {item.label}
            </ButtonLink>
          ))}
          {profile.role === "admin" && (
            <>
              <ButtonLink href="/plataformas" variant="ghost" size="sm">
                Plataformas
              </ButtonLink>
              <ButtonLink href="/catalogos" variant="ghost" size="sm">
                Catalogos
              </ButtonLink>
              <ButtonLink href="/usuarios" variant="ghost" size="sm">
                Usuarios
              </ButtonLink>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Badge variant="secondary">{USER_ROLE_LABELS[profile.role]}</Badge>
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
