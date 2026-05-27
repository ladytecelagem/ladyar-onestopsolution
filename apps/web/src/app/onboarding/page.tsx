import { createOrg } from "./actions";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        action={createOrg}
        className="w-full max-w-sm rounded-xl border border-border bg-surface p-6"
      >
        <h1 className="text-lg font-medium">Sua organização</h1>
        <p className="mt-1 mb-4 text-xs text-muted">
          Crie a organização para começar a usar a plataforma.
        </p>
        {sp.error && (
          <p className="mb-3 text-xs text-acoustic-rose">{sp.error}</p>
        )}
        <input
          className={input}
          name="org_name"
          type="text"
          placeholder="Nome da organização"
          required
        />
        <button className="mt-3 w-full rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
          Criar e continuar
        </button>
      </form>
    </div>
  );
}
