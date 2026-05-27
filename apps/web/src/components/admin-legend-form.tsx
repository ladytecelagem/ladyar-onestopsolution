"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAlias } from "@/app/(app)/admin/actions";

type Product = { id: string; name: string; category: string | null };

export function AdminLegendForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    const { error } = await createAlias(formData);
    setBusy(false);
    if (error) setError(error);
    else {
      const form = document.getElementById("alias-form") as HTMLFormElement | null;
      form?.reset();
      router.refresh();
    }
  }

  return (
    <form
      id="alias-form"
      action={submit}
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3"
    >
      <select
        name="product_id"
        required
        className="rounded-md border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
        defaultValue=""
      >
        <option value="" disabled>— selecione o produto —</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        name="alias"
        type="text"
        required
        placeholder="Alias (ex: PA-60, BAFFLE-V, NUVEM-100)"
        className="rounded-md border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
      />
      <input
        name="source"
        type="text"
        placeholder="Fonte / cliente (opcional)"
        className="rounded-md border border-border bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-gold"
      />
      {error && <p className="text-xs text-acoustic-rose">{error}</p>}
      <button
        disabled={busy}
        className="rounded-lg bg-gold py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "Salvando…" : "Adicionar alias"}
      </button>
    </form>
  );
}
