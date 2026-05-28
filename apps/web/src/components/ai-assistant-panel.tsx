"use client";

import { useState, useTransition } from "react";
import { generateDescription, generateJustification } from "@/app/(app)/projects/ai-actions";

type Props = {
  projectId: string;
  initialDescription: string | null;
  initialJustification: string | null;
};

export function AIAssistantPanel({ projectId, initialDescription, initialJustification }: Props) {
  const [tab, setTab] = useState<"desc" | "just">("desc");
  const [desc, setDesc] = useState(initialDescription ?? "");
  const [just, setJust] = useState(initialJustification ?? "");
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run() {
    setErr(null);
    start(async () => {
      try {
        if (tab === "desc") setDesc(await generateDescription(projectId));
        else setJust(await generateJustification(projectId));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Erro ao gerar");
      }
    });
  }

  const text = tab === "desc" ? desc : just;

  return (
    <section className="rounded-lg border border-[#BD9B60]/30 bg-[#1D3C34] p-5 text-[#F7F6F2]">
      <h2 className="mb-3 text-lg font-semibold text-[#BD9B60]">Assistente IA</h2>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setTab("desc")} className={tab === "desc" ? "rounded bg-[#BD9B60] px-3 py-1 text-sm text-[#101820]" : "rounded bg-white/10 px-3 py-1 text-sm"}>Descricao comercial</button>
        <button onClick={() => setTab("just")} className={tab === "just" ? "rounded bg-[#BD9B60] px-3 py-1 text-sm text-[#101820]" : "rounded bg-white/10 px-3 py-1 text-sm"}>Justificativa tecnica</button>
      </div>
      <button onClick={run} disabled={pending} className="mb-3 rounded bg-[#BD9B60] px-4 py-2 text-sm font-medium text-[#101820] disabled:opacity-50">{pending ? "Gerando..." : text ? "Regenerar" : "Gerar"}</button>
      {err ? <p className="mb-2 text-sm text-red-300">{err}</p> : null}
      {text ? (
        <div className="whitespace-pre-wrap rounded bg-[#101820] p-4 text-sm leading-relaxed">{text}</div>
      ) : (
        <p className="text-sm text-white/60">Nenhum texto gerado ainda.</p>
      )}
    </section>
  );
}
