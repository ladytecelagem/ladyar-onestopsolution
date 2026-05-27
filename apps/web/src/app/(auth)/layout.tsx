export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-medium tracking-[0.2em]">
            LADY<span className="text-gold">·AR</span>
          </span>
          <p className="mt-1 text-xs text-muted">
            Soluções acústicas inteligentes
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
