import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, room_type, status, area_m2, created_at")
    .order("created_at", { ascending: false });

  const list = projects ?? [];
  const total = list.length;
  const analyzed = list.filter((p) =>
    ["analyzed", "proposed", "done"].includes(p.status)
  ).length;
  const drafts = list.filter((p) => p.status === "draft").length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Seus projetos de tratamento acústico.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
        >
          Novo projeto
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="Projetos" value={total} />
        <Stat label="Analisados" value={analyzed} />
        <Stat label="Rascunhos" value={drafts} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted">Projetos</h2>
        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted">
              Nenhum projeto ainda. Crie o primeiro para começar.
            </p>
            <Link
              href="/projects/new"
              className="mt-3 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
            >
              Criar projeto
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-2xl font-medium text-gold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
