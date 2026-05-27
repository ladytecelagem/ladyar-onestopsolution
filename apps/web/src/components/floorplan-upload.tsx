"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerFloorplan } from "@/app/(app)/projects/floorplan-actions";

const ACCEPT = ".dxf,.pdf";
const MAX_MB = 50;

export function FloorplanUpload({
  projectId,
  orgId,
}: {
  projectId: string;
  orgId: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "dxf" && ext !== "pdf") {
      setError("Apenas arquivos .dxf ou .pdf são aceitos.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Arquivo excede o limite de ${MAX_MB} MB.`);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${orgId}/${projectId}/${Date.now()}_${safeName}`;

    const { error: upErr } = await supabase.storage
      .from("floorplans")
      .upload(path, file);
    if (upErr) {
      setError("Falha no upload: " + upErr.message);
      setBusy(false);
      return;
    }

    const { error: regErr } = await registerFloorplan(
      projectId,
      path,
      ext as "dxf" | "pdf"
    );
    if (regErr) {
      setError(regErr);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Enviar planta (DXF/PDF)"}
      </button>
      {error && <p className="mt-2 text-xs text-acoustic-rose">{error}</p>}
      <p className="mt-2 text-xs text-muted">
        Formatos: DXF ou PDF · máx. {MAX_MB} MB
      </p>
    </div>
  );
}
