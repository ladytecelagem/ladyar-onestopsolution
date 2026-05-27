import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryLabels } from "@/lib/labels";
import { AdminLegendForm } from "@/components/admin-legend-form";
import { AdminUnmappedItem } from "@/components/admin-unmapped-item";
import { AdminAliasItem } from "@/components/admin-alias-item";

export default async function AdminLegendsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) notFound();

  const { data: products } = await supabase
    .from("products")
    .select("id, name, category")
    .is("org_id", null)
    .order("category")
    .order("name");

  const { data: aliases } = await supabase
    .from("product_legend_aliases")
    .select("id, product_id, alias, source, created_at")
    .order("created_at", { ascending: false });

  // agrupa unmapped por texto normalizado, ordenado por frequência
  const { data: unmappedRaw } = await supabase
    .from("unmapped_legends")
    .select("text_raw, text_normalized")
    .order("created_at", { ascending: false })
    .limit(500);

  const unmappedMap = new Map<string, { raw: string; count: number }>();
  for (const row of unmappedRaw ?? []) {
    const k = row.text_normalized;
    const cur = unmappedMap.get(k);
    if (cur) cur.count++;
    else unmappedMap.set(k, { raw: row.text_raw, count: 1 });
  }
  const unmapped = Array.from(unmappedMap.entries())
    .map(([norm, v]) => ({ ...v, normalized: norm }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const aliasesByProduct = new Map<string, typeof aliases>();
  for (const a of aliases ?? []) {
    const list = aliasesByProduct.get(a.product_id) ?? [];
    list.push(a);
    aliasesByProduct.set(a.product_id, list);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/dashboard" className="text-xs text-muted hover:text-paper">
        ← Voltar ao dashboard
      </Link>
      <h1 className="mt-3 text-xl font-medium">Admin · Legendas de produtos</h1>
      <p className="mt-1 text-xs text-muted">
        Aliases são textos que aparecem nas plantas e devem ser interpretados
        como referência a um produto Lady. Comece pelos textos não-mapeados
        capturados das plantas dos clientes — eles indicam padrões reais.
      </p>

      {/* não-mapeados */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-paper">
          Textos não-mapeados ({unmapped.length})
        </h2>
        {unmapped.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted">
            Nenhum texto pendente. Quando uma planta é analisada e contém
            códigos desconhecidos, eles aparecem aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {unmapped.map((u) => (
              <AdminUnmappedItem
                key={u.normalized}
                raw={u.raw}
                normalized={u.normalized}
                count={u.count}
                products={products ?? []}
              />
            ))}
          </ul>
        )}
      </section>

      {/* form rápido */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-paper">Novo alias</h2>
        <AdminLegendForm products={products ?? []} />
      </section>

      {/* aliases por produto */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-paper">
          Aliases por produto
        </h2>
        <div className="flex flex-col gap-3">
          {(products ?? []).map((p) => {
            const list = aliasesByProduct.get(p.id) ?? [];
            return (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-surface p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-paper">{p.name}</p>
                  <span className="text-xs text-muted">
                    {p.category
                      ? categoryLabels[p.category] ?? p.category
                      : "—"}
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    Nenhum alias cadastrado.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-1">
                    {list.map((a) => (
                      <AdminAliasItem
                        key={a.id}
                        id={a.id}
                        alias={a.alias}
                        source={a.source}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
