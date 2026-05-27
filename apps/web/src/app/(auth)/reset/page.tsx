import Link from "next/link";
import { resetPassword } from "../actions";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  return (
    <form action={resetPassword} className="flex flex-col gap-3">
      <h1 className="text-lg font-medium">Redefinir senha</h1>
      {sp.msg && <p className="text-xs text-gold">{sp.msg}</p>}
      {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}
      <input className={input} name="email" type="email" placeholder="Email" required />
      <button className="mt-1 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
        Enviar link
      </button>
      <div className="mt-2 text-center text-xs text-muted">
        <Link href="/login" className="hover:text-paper">Voltar ao login</Link>
      </div>
    </form>
  );
}
