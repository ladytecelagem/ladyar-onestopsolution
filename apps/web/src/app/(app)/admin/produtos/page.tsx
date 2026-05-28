import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminProductItem } from "@/components/admin-product-item";

export default async function AdminProductsPage() {
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
    .select(
      "id, name, category, nrc, coverage_m2, price, finish, width_m, height_m, symbol_svg_url, icon_url"
    )
    .is("org_id", null)
    .order("category")
    .order("name");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="text-xs text-muted hover:text-paper">
          ← Voltar ao dashboard
        </Link>
        <Link
          href="/admin/legends"
          className="text-xs text-muted hover:text-paper"
        >
          Legendas →
        </Link>
      </div>
      <h1 className="mt-3 text-xl font-medium">Admin · Biblioteca de produtos</h1>
      <p className="mt-1 text-xs text-muted">
        Catálogo global Lady. Cada produto pode ter um símbolo 2D (SVG) que
        aparece sobre a planta no editor, com a dimensão física real.
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-paper">Novo produto</h2>
        <AdminProductForm />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-paper">
          Produtos cadastrados ({products?.length ?? 0})
        </h2>
        {!products || products.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-3 text-xs text-muted">
            Nenhum produto cadastrado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {products.map((p) => (
              <AdminProductItem key={p.id} product={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
