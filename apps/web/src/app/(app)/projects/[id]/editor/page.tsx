import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanEditorLoader } from "@/components/plan-editor-loader";
import type { CanvasState } from "@/lib/editor-types";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, canvas_state")
    .eq("id", id)
    .single();
  if (!project) notFound();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, category, price, nrc, width_m, height_m, symbol_svg_url, icon_url"
    )
    .is("org_id", null)
    .order("category")
    .order("name");

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href={"/projects/" + id}
          className="text-xs text-muted hover:text-paper"
        >
          ← Voltar ao projeto
        </Link>
        <h1 className="text-sm font-medium">{project.name} · Editor</h1>
      </div>
      <PlanEditorLoader
        projectId={project.id}
        products={products ?? []}
        initialState={(project.canvas_state as CanvasState | null) ?? null}
      />
    </div>
  );
}
