import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProjectCard } from "@/components/project-card";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ arquivados?: string }>;
}) {
  const sp = await searchParams;
  const showArchived = sp.arquivados === "1";
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, room_type, status, area_m2, archived, created_at")
    .order("created_at", { ascending: false });

  const all = projects ?? [];
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);

  // métricas consideram só projetos ativos
  const total = active.length;
  const analyzed = active.filter((p) =>
    ["analyzed", "proposed", "done"].includes(p.status)
  ).length;
  const drafts = active.filter((p) => p.status === "draft").length;

  const list = showArchived ? archived : active;

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
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted">
            {showArchived ? "Projetos arquivados" : "Projetos"}
          </h2>
          <div className="flex gap-3 text-xs">
            <Link
              href="/dashboard"
              className={
                !showArchived ? "text-gold" : "text-muted hover:text-paper"
              }
            >
              Ativos
            </Link>
            <Link
              href="/dashboard?arquivados=1"
              className={
                showArchived ? "text-gold" : "text-muted hover:text-paper"
              }
            >
              Arquivados ({archived.length})
            </Link>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted">
              {showArchived
                ? "Nenhum projeto arquivado."
                : "Nenhum projeto ainda. Crie o primeiro para começar."}
            </p>
            {!showArchived && (
              <Link
                href="/projects/new"
                className="mt-3 inline-block rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90"
              >
                Criar projeto
              </Link>
            )}
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
