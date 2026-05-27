"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkUnmapped, dismissUnmapped } from "@/app/(app)/admin/actions";

type Product = { id: string; name: string };

export function AdminUnmappedItem({
  raw,
  normalized,
  count,
  products,
}: {
  raw: string;
  normalized: string;
  count: number;
  products: Product[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");

  async function link() {
    if (!productId) return;
    setBusy(true);
    const { error } = await linkUnmapped(productId, raw);
    setBusy(false);
    if (error) alert(error);
    else router.refresh();
  }

  async function dismiss() {
    setBusy(true);
    const { error } = await dismissUnmapped(normalized);
    setBusy(false);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <li className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-paper">{raw}</p>
        <p className="text-[11px] text-muted">{count}× nas plantas</p>
      </div>
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        disabled={busy}
        className="rounded-md border border-border bg-ink px-2 py-1 text-xs text-paper outline-none focus:border-gold"
      >
        <option value="">— vincular a —</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button
        onClick={link}
        disabled={busy || !productId}
        className="rounded-md border border-gold px-2 py-1 text-xs text-gold hover:bg-gold hover:text-ink disabled:opacity-50"
      >
        Vincular
      </button>
      <button
        onClick={dismiss}
        disabled={busy}
        className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-paper disabled:opacity-50"
      >
        Descartar
      </button>
    </li>
  );
}
