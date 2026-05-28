"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createProduct,
  updateProduct,
} from "@/app/(app)/admin/product-actions";

type Product = {
  id?: string;
  name?: string;
  category?: string | null;
  nrc?: number | null;
  coverage_m2?: number | null;
  price?: number | null;
  finish?: string | null;
  width_m?: number | null;
  height_m?: number | null;
  symbol_svg_url?: string | null;
  icon_url?: string | null;
};

const CATEGORIES = [
  { value: "paineis", label: "Painéis acústicos" },
  { value: "baffles", label: "Baffles" },
  { value: "divisorias", label: "Divisórias" },
  { value: "nuvens", label: "Nuvens acústicas" },
  { value: "phone_booths", label: "Cabines / Phone booths" },
  { value: "revestimentos", label: "Revestimentos" },
];

const field =
  "w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold";

export function AdminProductForm({
  product,
  onDone,
}: {
  product?: Product;
  onDone?: () => void;
}) {
  const router = useRouter();
  const editing = !!product?.id;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [symbolUrl, setSymbolUrl] = useState(product?.symbol_svg_url ?? "");
  const [iconUrl, setIconUrl] = useState(product?.icon_url ?? "");
  const [uploadingSymbol, setUploadingSymbol] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const symbolRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);

  async function uploadAsset(
    file: File,
    kind: "symbol" | "icon"
  ): Promise<string | null> {
    const supabase = createClient();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${kind}/${Date.now()}_${safe}`;
    const { error: upErr } = await supabase.storage
      .from("product-assets")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setError("Falha no upload: " + upErr.message);
      return null;
    }
    const { data } = supabase.storage
      .from("product-assets")
      .getPublicUrl(path);
    return data.publicUrl;
  }

  async function onSymbolChange(file: File) {
    if (file.type !== "image/svg+xml") {
      setError("O símbolo 2D deve ser um arquivo SVG.");
      return;
    }
    setUploadingSymbol(true);
    setError(null);
    const url = await uploadAsset(file, "symbol");
    setUploadingSymbol(false);
    if (url) setSymbolUrl(url);
  }

  async function onIconChange(file: File) {
    setUploadingIcon(true);
    setError(null);
    const url = await uploadAsset(file, "icon");
    setUploadingIcon(false);
    if (url) setIconUrl(url);
  }

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    formData.set("symbol_svg_url", symbolUrl);
    formData.set("icon_url", iconUrl);
    const res = editing
      ? await updateProduct(product!.id!, formData)
      : await createProduct(formData);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
    if (onDone) onDone();
    if (!editing) {
      // limpa para novo cadastro
      setSymbolUrl("");
      setIconUrl("");
      (document.getElementById("product-form") as HTMLFormElement | null)?.reset();
    }
  }

  return (
    <form
      id="product-form"
      action={submit}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-muted">
          Nome do produto
          <input
            name="name"
            type="text"
            required
            defaultValue={product?.name ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="text-xs text-muted">
          Categoria
          <select
            name="category"
            defaultValue={product?.category ?? ""}
            className={field + " mt-1"}
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          Acabamento
          <input
            name="finish"
            type="text"
            defaultValue={product?.finish ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="text-xs text-muted">
          NRC (0–1)
          <input
            name="nrc"
            type="number"
            step="0.01"
            min="0"
            max="1"
            defaultValue={product?.nrc ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="text-xs text-muted">
          Cobertura (m²/unidade)
          <input
            name="coverage_m2"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.coverage_m2 ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="text-xs text-muted">
          Largura real (m)
          <input
            name="width_m"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.width_m ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="text-xs text-muted">
          Altura/profundidade real (m)
          <input
            name="height_m"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.height_m ?? ""}
            className={field + " mt-1"}
          />
        </label>

        <label className="col-span-2 text-xs text-muted">
          Preço (R$)
          <input
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product?.price ?? ""}
            className={field + " mt-1"}
          />
        </label>
      </div>

      {/* assets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="text-xs text-muted">
          Símbolo 2D (SVG)
          <input
            ref={symbolRef}
            type="file"
            accept="image/svg+xml,.svg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSymbolChange(f);
              e.target.value = "";
            }}
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => symbolRef.current?.click()}
              disabled={uploadingSymbol}
              className="rounded-md border border-gold px-3 py-1.5 text-xs text-gold hover:bg-gold hover:text-ink disabled:opacity-50"
            >
              {uploadingSymbol
                ? "Enviando…"
                : symbolUrl
                ? "Trocar SVG"
                : "Enviar SVG"}
            </button>
            {symbolUrl && (
              <span className="truncate text-[11px] text-acoustic-green">
                ✓ enviado
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-muted">
          Ícone da biblioteca (PNG/SVG)
          <input
            ref={iconRef}
            type="file"
            accept="image/svg+xml,image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onIconChange(f);
              e.target.value = "";
            }}
          />
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => iconRef.current?.click()}
              disabled={uploadingIcon}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-muted hover:text-paper disabled:opacity-50"
            >
              {uploadingIcon
                ? "Enviando…"
                : iconUrl
                ? "Trocar ícone"
                : "Enviar ícone"}
            </button>
            {iconUrl && (
              <span className="text-[11px] text-acoustic-green">✓ enviado</span>
            )}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-acoustic-rose">{error}</p>}

      <button
        disabled={busy}
        className="rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        {busy
          ? "Salvando…"
          : editing
          ? "Salvar alterações"
          : "Adicionar produto"}
      </button>
    </form>
  );
}
