import { categoryLabels } from "@/lib/labels";

type Product = {
  id: string;
  name: string;
  nrc: number | null;
  price: number | null;
  coverage_m2: number | null;
};

type Recommendations = {
  category: string;
  target_area_m2: number;
  products: Product[];
};

type Analysis = {
  rt60_before: number | null;
  rt60_after: number | null;
  score_before: number | null;
  score_after: number | null;
  recommendations: Recommendations | null;
};

function scoreColor(s: number): string {
  if (s >= 75) return "text-acoustic-green";
  if (s >= 45) return "text-gold";
  return "text-acoustic-rose";
}

export function AnalysisPanel({ analysis }: { analysis: Analysis }) {
  const rec = analysis.recommendations;
  const before = analysis.score_before ?? 0;
  const after = analysis.score_after ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Metric
          label="RT60 atual"
          value={(analysis.rt60_before ?? 0).toFixed(2) + " s"}
          sub={"Score " + before}
          subClass={scoreColor(before)}
        />
        <Metric
          label="RT60 após tratamento"
          value={(analysis.rt60_after ?? 0).toFixed(2) + " s"}
          sub={"Score " + after}
          subClass={scoreColor(after)}
        />
      </div>

      {rec && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium text-paper">
            Recomendação acústica
          </p>
          <p className="mt-1 text-xs text-muted">
            Categoria sugerida:{" "}
            <span className="text-gold">
              {categoryLabels[rec.category] ?? rec.category}
            </span>{" "}
            · área de tratamento estimada:{" "}
            <span className="text-paper">{rec.target_area_m2} m²</span>
          </p>

          {rec.products.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {rec.products.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-paper">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.nrc != null ? "NRC " + p.nrc : "—"}
                      {p.coverage_m2 ? ` · ${p.coverage_m2} m²/un` : ""}
                    </p>
                  </div>
                  {p.price != null && (
                    <span className="text-sm text-gold">
                      R$ {p.price.toLocaleString("pt-BR")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted">
              Nenhum produto cadastrado nesta categoria ainda. A biblioteca de
              produtos chega na Fase 11.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  subClass,
}: {
  label: string;
  value: string;
  sub: string;
  subClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-medium text-paper">{value}</p>
      <p className={"mt-1 text-xs " + subClass}>{sub}</p>
    </div>
  );
}
