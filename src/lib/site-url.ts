import "server-only"

import { headers } from "next/headers"

import { env } from "@/lib/env"

/** URL publica de la app, para armar los links que van por email. */
export async function getSiteUrl() {
  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const proto = headerList.get("x-forwarded-proto") ?? "https"
  return `${proto}://${host}`
}
