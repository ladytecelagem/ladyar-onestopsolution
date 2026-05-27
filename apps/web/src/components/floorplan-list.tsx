"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getFloorplanUrl,
  deleteFloorplan,
} from "@/app/(app)/projects/floorplan-actions";
import {
  parseFloorplan,
  applyParsedAreaToProject,
  type ParseResult,
} from "@/app/(app)/projects/parse-actions";

type Floorplan = {
  id: string;
  file_url: string;
  file_type: string | null;
  parsed_geometry: {
    width_m?: number;
    height_m?: number;
    area_m2?: number;
    units?: string;
    pdf_pages?: number;
    found_areas?: number[];
  } | null;
  created_at: string;
};

const UNIT_LABEL: Record<string, string> = {
  m: "metros",
  mm: "milímetros (convertidos)",
  cm: "centímetros (convertidos)",
  unknown: "indeterminada",
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
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [applying, setApplying] = useState<number | null>(null);

  if (floorplans.length === 0) {
    return (
      <p className="text-sm text-muted">Nenhuma planta enviada ainda.</p>
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
    setBusyAction("delete");
    const { error } = await deleteFloorplan(fp.id, fp.file_url, projectId);
    setBusyId(null);
    setBusyAction(null);
    if (error) alert(error);
    else router.refresh();
  }

  async function analyze(fp: Floorplan) {
    setBusyId(fp.id);
    setBusyAction("parse");
    const r = await parseFloorplan(fp.id);
    setBusyId(null);
    setBusyAction(null);
    setResult(r);
    if (r.ok) router.refresh();
  }

  async function applyArea(area: number) {
    setApplying(area);
    const { error } = await applyParsedAreaToProject(projectId, area);
    setApplying(null);
    if (error) {
      alert(error);
      return;
    }
    setResult(null);
    router.refresh();
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {floorplans.map((fp) => {
          const name = fp.file_url.split("/").pop() ?? fp.file_url;
          const parsed = fp.parsed_geometry;
          const detectedArea = parsed?.area_m2;
          return (
            <li
              key={fp.id}
              className="rounded-lg border border-border bg-surface px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{name}</p>
                  <p className="text-xs text-muted">
                    {fp.file_type?.toUpperCase()} ·{" "}
                    {new Date(fp.created_at).toLocaleDateString("pt-BR")}
                    {detectedArea != null && detectedArea > 0 && (
                      <span className="ml-2 text-acoustic-green">
                        · {detectedArea} m² detectados
                      </span>
                    )}
                    {parsed?.pdf_pages && (
                      <span className="ml-2 text-muted">
                        · {parsed.pdf_pages}{" "}
                        {parsed.pdf_pages > 1 ? "páginas" : "página"}
                      </span>
                    )}
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
                    onClick={() => analyze(fp)}
                    disabled={busyId === fp.id}
                    className="rounded-md border border-gold px-2 py-1 text-xs text-gold hover:bg-gold hover:text-ink disabled:opacity-50"
                  >
                    {busyId === fp.id && busyAction === "parse"
                      ? "Analisando…"
                      : parsed
                      ? "Reanalisar"
                      : "Analisar planta"}
                  </button>
                  <button
                    onClick={() => remove(fp)}
                    disabled={busyId === fp.id}
                    className="rounded-md border border-border px-2 py-1 text-xs text-acoustic-rose hover:opacity-80 disabled:opacity-50"
                  >
                    {busyId === fp.id && busyAction === "delete"
                      ? "…"
                      : "Remover"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {result && (
        <ResultDialog
          result={result}
          applying={applying}
          onApplyArea={applyArea}
          onClose={() => setResult(null)}
        />
      )}
    </>
  );
}

function ResultDialog({
  result,
  applying,
  onApplyArea,
  onClose,
}: {
  result: ParseResult;
  applying: number | null;
  onApplyArea: (area: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-ink p-5">
        {result.ok ? (
          <>
            <h3 className="text-sm font-medium text-paper">
              Análise da planta —{" "}
              {result.file_type === "pdf" ? "PDF" : "DXF"}
            </h3>

            {/* bloco 1: dimensões DXF */}
            {result.file_type === "dxf" && (
              <div className="mt-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  Dimensões detectadas
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Info label="Largura" value={result.width_m + " m"} />
                  <Info label="Altura" value={result.height_m + " m"} />
                  <Info
                    label="Área detectada"
                    value={result.area_m2 + " m²"}
                    accent
                  />
                  <Info
                    label="Unidade"
                    value={UNIT_LABEL[result.units ?? "unknown"]}
                  />
                </div>
                <button
                  onClick={() => onApplyArea(result.area_m2!)}
                  disabled={applying === result.area_m2}
                  className="mt-2 w-full rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
                >
                  {applying === result.area_m2
                    ? "Aplicando…"
                    : "Aplicar área detectada ao projeto"}
                </button>
              </div>
            )}

            {/* bloco 2: áreas anotadas */}
            {result.found_areas && result.found_areas.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                  Áreas escritas na planta
                </p>
                <p className="mb-2 text-xs text-muted">
                  Valores em m² encontrados em textos/cotas. Clique para
                  aplicar ao projeto.
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.found_areas.map((a) => (
                    <button
                      key={a}
                      onClick={() => onApplyArea(a)}
                      disabled={applying === a}
                      className="rounded-md border border-border bg-surface px-3 py-1 text-xs text-paper hover:border-gold disabled:opacity-50"
                    >
                      {applying === a ? "…" : a + " m²"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* bloco 3: produtos detectados */}
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                Produtos identificados na planta
              </p>
              {result.detected_products &&
              result.detected_products.length > 0 ? (
                <ul className="flex flex-col gap-1">
                  {result.detected_products.map((p) => (
                    <li
                      key={p.product_id}
                      className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-xs"
                    >
                      <div>
                        <p className="text-paper">{p.product_name}</p>
                        <p className="text-muted">
                          {p.matched_aliases.join(" · ")}
                        </p>
                      </div>
                      <span className="text-gold">×{p.count}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted">
                  Nenhum produto identificado. O catálogo de legendas começa
                  vazio e é populado conforme novos códigos são cadastrados.
                </p>
              )}
            </div>

            {/* bloco 4: candidatos não-mapeados */}
            {result.unmapped_candidates &&
              result.unmapped_candidates.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                    Textos não-mapeados
                  </p>
                  <p className="mb-2 text-xs text-muted">
                    Estes textos parecem códigos mas ainda não estão no
                    catálogo de legendas. Foram registrados para aprendizado
                    futuro.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {result.unmapped_candidates.map((t) => (
                      <span
                        key={t}
                        className="rounded border border-border bg-surface px-2 py-0.5 text-[11px] text-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-paper"
            >
              Fechar
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-medium text-paper">
              Não foi possível analisar
            </h3>
            <p className="mt-3 text-xs text-muted">{result.error}</p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-lg border border-border py-2 text-sm text-muted hover:text-paper"
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Info({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className={"mt-1 text-sm " + (accent ? "text-gold" : "text-paper")}>
        {value}
      </p>
    </div>
  );
}
