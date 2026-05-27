"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFloorplanUrl,
  deleteFloorplan,
} from "@/app/(app)/projects/floorplan-actions";

type Floorplan = {
  id: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
};

export function FloorplanList({
  floorplans,
  projectId,
}: {
  floorplans: Floorplan[];
  projectId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (floorplans.length === 0) {
    return (
      <p className="text-sm text-muted">
        Nenhuma planta enviada ainda.
      </p>
    );
  }

  async function open(path: string) {
    const { url, error } = await getFloorplanUrl(path);
    if (url) window.open(url, "_blank");
    else alert(error ?? "Erro ao abrir o arquivo.");
  }

  async function remove(fp: Floorplan) {
    if (!confirm("Remover esta planta?")) return;
    setBusyId(fp.id);
    const { error } = await deleteFloorplan(fp.id, fp.file_url, projectId);
    setBusyId(null);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {floorplans.map((fp) => {
        const name = fp.file_url.split("/").pop() ?? fp.file_url;
        return (
          <li
            key={fp.id}
            className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm text-paper">{name}</p>
              <p className="text-xs text-muted">
                {fp.file_type?.toUpperCase()} ·{" "}
                {new Date(fp.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => open(fp.file_url)}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-paper"
              >
                Abrir
              </button>
              <button
                onClick={() => remove(fp)}
                disabled={busyId === fp.id}
                className="rounded-md border border-border px-2 py-1 text-xs text-acoustic-rose hover:opacity-80 disabled:opacity-50"
              >
                {busyId === fp.id ? "…" : "Remover"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
