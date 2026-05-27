"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setArchived, deleteProject } from "@/app/(app)/projects/actions";

export function ProjectActions({
  projectId,
  archived,
}: {
  projectId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleArchive() {
    setBusy("archive");
    const { error } = await setArchived(projectId, !archived);
    setBusy(null);
    if (error) alert(error);
    else router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        "Excluir este projeto? Plantas, análises e propostas serão removidas permanentemente. Esta ação não pode ser desfeita."
      )
    )
      return;
    setBusy("delete");
    const { error } = await deleteProject(projectId);
    setBusy(null);
    if (error) {
      alert(error);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex gap-2">
      <Link
        href={"/projects/" + projectId + "/edit"}
        className="rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-paper"
      >
        Editar
      </Link>
      <button
        onClick={toggleArchive}
        disabled={busy !== null}
        className="rounded-md border border-border px-3 py-1 text-xs text-muted hover:text-paper disabled:opacity-50"
      >
        {busy === "archive"
          ? "…"
          : archived
          ? "Desarquivar"
          : "Arquivar"}
      </button>
      <button
        onClick={remove}
        disabled={busy !== null}
        className="rounded-md border border-border px-3 py-1 text-xs text-acoustic-rose hover:opacity-80 disabled:opacity-50"
      >
        {busy === "delete" ? "Excluindo…" : "Excluir"}
      </button>
    </div>
  );
}
