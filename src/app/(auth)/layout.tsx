export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="text-lg font-semibold tracking-tight">
          Cotizador Nico Shopping
        </span>
        <span className="text-sm text-muted-foreground">
          Sistema interno de licitaciones
        </span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  )
}
