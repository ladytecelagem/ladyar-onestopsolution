import Link from "next/link";
import { signup } from "../actions";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <form action={signup} className="flex flex-col gap-3">
      <h1 className="text-lg font-medium">Criar conta</h1>
      {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}
      <input className={input} name="full_name" type="text" placeholder="Nome completo" required />
      <input className={input} name="email" type="email" placeholder="Email" required />
      <input className={input} name="password" type="password" placeholder="Senha (min. 6)" minLength={6} required />
      <button className="mt-1 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
        Criar conta
      </button>
      <div className="mt-2 text-center text-xs text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="hover:text-paper">Entrar</Link>
      </div>
    </form>
  );
}
