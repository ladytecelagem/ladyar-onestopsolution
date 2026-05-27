import Link from "next/link";
import { createProject } from "../actions";
import { roomTypeLabels } from "@/lib/labels";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <Link href="/dashboard" className="text-xs text-muted hover:text-paper">
        ← Voltar
      </Link>
      <h1 className="mt-3 text-xl font-medium">Novo projeto</h1>
      <form action={createProject} className="mt-5 flex flex-col gap-3">
        {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}
        <label className="text-xs text-muted">
          Nome do projeto
          <input className={input + " mt-1"} name="name" type="text" required />
        </label>
        <label className="text-xs text-muted">
          Tipo de ambiente
          <select className={input + " mt-1"} name="room_type" required>
            {Object.entries(roomTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Área (m²) — opcional
          <input
            className={input + " mt-1"}
            name="area_m2"
            type="number"
            step="0.1"
            min="0"
          />
        </label>
        <button className="mt-2 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
          Criar projeto
        </button>
      </form>
    </div>
  );
}
