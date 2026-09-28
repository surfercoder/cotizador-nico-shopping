import { after } from "next/server"

import { syncOrion } from "@/lib/orion-sync"

/**
 * Entrada del cron de Vercel. Vercel manda `Authorization: Bearer $CRON_SECRET`,
 * asi que sin ese header no corre nada: el endpoint es publico por URL.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("No autorizado", { status: 401 })
  }

  try {
    const resultado = await syncOrion()
    return Response.json(resultado)
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido"
    // El detalle ya quedo en platforms.last_sync_error para verlo desde la UI.
    after(() => console.error("[sync orion]", mensaje))
    return Response.json({ error: mensaje }, { status: 502 })
  }
}
