import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { saveBriefing } from "../../briefing-actions";
import type { Briefing } from "@/lib/acoustics";

const field =
  "w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

type Opt = { value: string; label: string };

const FLOOR: Opt[] = [
  { value: "carpete", label: "Carpete" },
  { value: "vinilico", label: "Vinílico / laminado" },
  { value: "madeira", label: "Madeira" },
  { value: "porcelanato", label: "Porcelanato / cerâmica" },
];
const WALLS: Opt[] = [
  { value: "muito_vidro", label: "Muito vidro / envidraçado" },
  { value: "misto", label: "Misto (vidro + alvenaria)" },
  { value: "alvenaria", label: "Alvenaria / drywall" },
];
const CEILING: Opt[] = [
  { value: "gesso", label: "Gesso / drywall" },
  { value: "mineral", label: "Forro mineral acústico" },
  { value: "laje_exposta", label: "Laje exposta" },
];
const USAGE: Opt[] = [
  { value: "foco", label: "Trabalho de foco / concentração" },
  { value: "colaboracao", label: "Colaboração / conversas" },
  { value: "misto", label: "Misto" },
];
const COMPLAINT: Opt[] = [
  { value: "eco", label: "Eco / reverberação" },
  { value: "vazamento", label: "Vazamento de som entre áreas" },
  { value: "ruido_externo", label: "Ruído externo" },
  { value: "sem_queixa", label: "Sem queixa específica" },
];
const BUDGET: Opt[] = [
  { value: "baixo", label: "Enxuto" },
  { value: "medio", label: "Intermediário" },
  { value: "alto", label: "Premium" },
];

function Select({
  name,
  label,
  options,
  current,
}: {
  name: string;
  label: string;
  options: Opt[];
  current?: string;
}) {
  return (
    <label className="text-xs text-muted">
      {label}
      <select
        className={field + " mt-1"}
        name={name}
        defaultValue={current ?? ""}
      >
        <option value="">— selecione —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default async function BriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, briefing")
    .eq("id", id)
    .single();

  if (!project) notFound();

  const b = (project.briefing as Briefing | null) ?? {};
  const save = saveBriefing.bind(null, id);

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href={"/projects/" + id}
        className="text-xs text-muted hover:text-paper"
      >
        ← Voltar
      </Link>
      <h1 className="mt-3 text-xl font-medium">Briefing acústico</h1>
      <p className="mt-1 text-xs text-muted">
        Quanto mais campos preenchidos, mais precisa fica a análise. Campos em
        branco usam estimativas padrão do tipo de ambiente. Salvar o briefing
        recalcula a análise.
      </p>

      <form action={save} className="mt-5 flex flex-col gap-3">
        {sp.error && <p className="text-xs text-acoustic-rose">{sp.error}</p>}

        <label className="text-xs text-muted">
          Pé-direito real (m)
          <input
            className={field + " mt-1"}
            name="ceiling_height_m"
            type="number"
            step="0.1"
            min="0"
            placeholder="ex: 2.8"
            defaultValue={b.ceiling_height_m ?? ""}
          />
        </label>

        <Select
          name="floor"
          label="Piso predominante"
          options={FLOOR}
          current={b.floor}
        />
        <Select
          name="walls"
          label="Vedação das paredes"
          options={WALLS}
          current={b.walls}
        />
        <Select
          name="ceiling"
          label="Forro / teto"
          options={CEILING}
          current={b.ceiling}
        />

        <label className="text-xs text-muted">
          Ocupação típica (nº de pessoas)
          <input
            className={field + " mt-1"}
            name="occupancy"
            type="number"
            step="1"
            min="0"
            placeholder="ex: 12"
            defaultValue={b.occupancy ?? ""}
          />
        </label>

        <Select
          name="usage"
          label="Uso principal do espaço"
          options={USAGE}
          current={b.usage}
        />
        <Select
          name="complaint"
          label="Queixa acústica principal"
          options={COMPLAINT}
          current={b.complaint}
        />
        <Select
          name="budget"
          label="Faixa de orçamento"
          options={BUDGET}
          current={b.budget}
        />

        <div className="mt-2 flex gap-2">
          <button className="flex-1 rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90">
            Salvar briefing
          </button>
          <Link
            href={"/projects/" + id}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-paper"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
