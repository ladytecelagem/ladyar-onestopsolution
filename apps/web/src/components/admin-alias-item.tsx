"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAlias } from "@/app/(app)/admin/actions";

export function AdminAliasItem({
  id,
  alias,
  source,
}: {
  id: string;
  alias: string;
  source: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Remover alias \"" + alias + "\"?")) return;
    setBusy(true);
    const { error } = await deleteAlias(id);
    setBusy(false);
    if (error) alert(error);
    else router.refresh();
  }

  return (
    <li
      className="flex items-center gap-1 rounded-md border border-border bg-ink px-2 py-1 text-xs"
      title={source ? "Fonte: " + source : undefined}
    >
      <span className="text-paper">{alias}</span>
      <button
        onClick={remove}
        disabled={busy}
        className="text-muted hover:text-acoustic-rose disabled:opacity-50"
        aria-label="Remover"
      >
        ×
      </button>
    </li>
  );
}
