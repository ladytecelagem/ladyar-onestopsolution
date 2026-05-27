"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runAnalysis } from "@/app/(app)/projects/analysis-actions";

export function AnalyzeButton({
  projectId,
  label,
}: {
  projectId: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    const { error } = await runAnalysis(projectId);
    setBusy(false);
    if (error) setError(error);
    else router.refresh();
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-gold px-4 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Calculando…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-acoustic-rose">{error}</p>}
    </div>
  );
}
