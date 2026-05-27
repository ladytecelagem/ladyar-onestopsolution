import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roomTypeLabels, statusLabels, statusColors } from "@/lib/labels";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, room_type, status, area_m2, created_at")
    .eq("id", id)
    .single();

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard" className="text-xs text-muted hover:text-paper">
        ← Voltar
      </Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-medium">{project.name}</h1>
        <span className={"text-xs " + (statusColors[project.status] ?? "text-muted")}>
          {statusLabels[project.status] ?? project.status}
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Field
          label="Tipo de ambiente"
          value={
            project.room_type
              ? roomTypeLabels[project.room_type] ?? project.room_type
              : "—"
          }
        />
        <Field
          label="Área"
          value={project.area_m2 ? project.area_m2 + " m²" : "—"}
        />
      </div>
      <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted">
          Upload de planta e análise acústica chegam na Fase 5.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm text-paper">{value}</p>
    </div>
  );
}
