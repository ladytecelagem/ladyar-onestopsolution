import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProject } from "../../actions";
import { roomTypeLabels } from "@/lib/labels";

const input =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export default async function EditProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, room_type, area_m2")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const save = updateProject.bind(null, id);

  return (
    <div className="mx-auto max-w-md">
      <Link
        href={"/projects/" + id}
        className="text-xs text-muted hover:text-paper"
      >
        ← Voltar
      </Link>
      <h1 className="mt-3 text-xl font-medium">Editar projeto</h1>
      <p className="mt-1 text-xs text-muted">
        Alterar o tipo de ambiente ou a área limpa a análise atual — será
        preciso recalcular.
      </p>
      <form action={save} className="mt-5 flex flex-col gap-3">
        {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}
        <label className="text-xs text-muted">
          Nome do projeto
          <input
            className={input + " mt-1"}
            name="name"
            type="text"
            defaultValue={project.name}
            required
          />
        </label>
        <label className="text-xs text-muted">
          Tipo de ambiente
          <select
            className={input + " mt-1"}
            name="room_type"
            defaultValue={project.room_type ?? ""}
            required
          >
            {Object.entries(roomTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Área (m²)
          <input
            className={input + " mt-1"}
            name="area_m2"
            type="number"
            step="0.1"
            min="0"
            defaultValue={project.area_m2 ?? ""}
          />
        </label>
        <div className="mt-2 flex gap-2">
          <button className="flex-1 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
            Salvar alterações
          </button>
          <Link
            href={"/projects/" + id}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-paper"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
