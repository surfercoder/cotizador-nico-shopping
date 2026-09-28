import type { Metadata } from "next"

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requireRole } from "@/lib/dal"
import { createClient } from "@/lib/supabase/server"
import { UserRowForm } from "./user-row-form"

export const metadata: Metadata = { title: "Usuarios" }

export default async function UsersPage() {
  const admin = await requireRole("admin")

  const supabase = await createClient()
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at, updated_at")
    .order("created_at", { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Cada cuenta nueva entra deshabilitada hasta que la habilites aca.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead colSpan={3} className="text-right">
              Acceso
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users ?? []).map((user) => (
            <UserRowForm
              key={user.id}
              user={user}
              isSelf={user.id === admin.id}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
