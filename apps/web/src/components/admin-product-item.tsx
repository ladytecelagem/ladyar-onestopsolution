"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProduct } from "@/app/(app)/admin/product-actions";
import { AdminProductForm } from "./admin-product-form";
import { categoryLabels } from "@/lib/labels";

type Product = {
  id: string;
  name: string;
  category: string | null;
  nrc: number | null;
  coverage_m2: number | null;
  price: number | null;
  finish: string | null;
  width_m: number | null;
  height_m: number | null;
  symbol_svg_url: string | null;
  icon_url: string | null;
};

export function AdminProductItem({ product }: { product: Product }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm('Excluir o produto "' + product.name + '"? Esta ação não pode ser desfeita.'))
      return;
    setBusy(true);
    const { error } = await deleteProduct(product.id);
    setBusy(false);
    if (error) alert(error);
    else router.refresh();
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-gold bg-surface p-2">
        <AdminProductForm product={product} onDone={() => setEditing(false)} />
        <button
          onClick={() => setEditing(false)}
          className="mt-2 text-xs text-muted hover:text-paper"
        >
          Cancelar edição
        </button>
      </li>
    );
  }

  const dims =
    product.width_m && product.height_m
      ? `${product.width_m}×${product.height_m} m`
      : "—";

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-ink">
        {product.icon_url || product.symbol_svg_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.icon_url ?? product.symbol_svg_url ?? ""}
            alt=""
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="text-[10px] text-muted">sem img</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{product.name}</p>
        <p className="text-xs text-muted">
          {product.category
            ? categoryLabels[product.category] ?? product.category
            : "—"}{" "}
          · {dims}
          {product.nrc != null && ` · NRC ${product.nrc}`}
          {product.price != null &&
            ` · R$ ${product.price.toLocaleString("pt-BR")}`}
          {product.symbol_svg_url && (
            <span className="text-acoustic-green"> · SVG ✓</span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-paper"
        >
          Editar
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-md border border-border px-2 py-1 text-xs text-acoustic-rose hover:opacity-80 disabled:opacity-50"
        >
          {busy ? "…" : "Excluir"}
        </button>
      </div>
    </li>
  );
}
