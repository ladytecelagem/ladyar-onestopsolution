import Link from "next/link";
import { login } from "../actions";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; msg?: string }>;
}) {
  const sp = await searchParams;
  return (
    <form action={login} className="flex flex-col gap-3">
      <h1 className="text-lg font-medium">Entrar</h1>
      {sp.msg && <p className="text-xs text-gold">{sp.msg}</p>}
      {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}
      <input className={input} name="email" type="email" placeholder="Email" required />
      <input className={input} name="password" type="password" placeholder="Senha" required />
      <button className="mt-1 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
        Entrar
      </button>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <Link href="/reset" className="hover:text-paper">Esqueci a senha</Link>
        <Link href="/signup" className="hover:text-paper">Criar conta</Link>
      </div>
    </form>
  );
}
