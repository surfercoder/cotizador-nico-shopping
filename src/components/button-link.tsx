import Link from "next/link"

import { Button } from "@/components/ui/button"

/**
 * Boton que navega. Base UI necesita `nativeButton={false}` cuando el render
 * no es un <button> nativo, si no rompe semantica y accesibilidad.
 */
export function ButtonLink({
  href,
  ...props
}: React.ComponentProps<typeof Button> & { href: React.ComponentProps<typeof Link>["href"] }) {
  return <Button nativeButton={false} render={<Link href={href} />} {...props} />
}
