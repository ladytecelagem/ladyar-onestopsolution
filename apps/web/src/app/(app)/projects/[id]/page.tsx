import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roomTypeLabels, statusLabels, statusColors } from "@/lib/labels";
import { FloorplanUpload } from "@/components/floorplan-upload";
import { FloorplanList } from "@/components/floorplan-list";
import { AnalyzeButton } from "@/components/analyze-button";
import { AnalysisPanel } from "@/components/analysis-panel";

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

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const { data: floorplans } = await supabase
    .from("floorplans")
    .select("id, file_url, file_type, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const { data: analysis } = await supabase
    .from("acoustic_analysis")
    .select("rt60_before, rt60_after, score_before, score_after, recommendations")
    .eq("project_id", id)
    .maybeSingle();

  const canAnalyze = !!project.area_m2 && !!project.room_type;

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

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Plantas</h2>
        {profile?.org_id && (
          <div className="mb-4">
            <FloorplanUpload projectId={project.id} orgId={profile.org_id} />
          </div>
        )}
        <FloorplanList
          floorplans={floorplans ?? []}
          projectId={project.id}
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted">
          Análise acústica
        </h2>
        {!canAnalyze ? (
          <p className="text-sm text-muted">
            Defina o tipo de ambiente e a área do projeto para rodar a análise.
          </p>
        ) : analysis ? (
          <div className="flex flex-col gap-4">
            <AnalysisPanel analysis={analysis} />
            <AnalyzeButton
              projectId={project.id}
              label="Recalcular análise"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="mb-3 text-sm text-muted">
              Calcule o RT60 e receba recomendações de tratamento.
            </p>
            <AnalyzeButton
              projectId={project.id}
              label="Rodar análise acústica"
            />
          </div>
        )}
      </section>
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
