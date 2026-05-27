"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { normalizeText } from "@/lib/text-utils";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, ok: false as const, error: "Não autenticado." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin)
    return { supabase, ok: false as const, error: "Acesso restrito a administradores." };
  return { supabase, ok: true as const };
}

export async function createAlias(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const productId = String(formData.get("product_id") ?? "");
  const alias = String(formData.get("alias") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim() || null;
  if (!productId || !alias) return { error: "Produto e alias são obrigatórios." };

  const { error } = await guard.supabase
    .from("product_legend_aliases")
    .insert({
      product_id: productId,
      alias,
      alias_normalized: normalizeText(alias),
      source,
    });
  if (error) return { error: error.message };

  // se o alias casa com algum unmapped, limpa
  await guard.supabase
    .from("unmapped_legends")
    .delete()
    .eq("text_normalized", normalizeText(alias));

  revalidatePath("/admin/legends");
  return { error: null };
}

export async function deleteAlias(aliasId: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const { error } = await guard.supabase
    .from("product_legend_aliases")
    .delete()
    .eq("id", aliasId);
  if (error) return { error: error.message };

  revalidatePath("/admin/legends");
  return { error: null };
}

// vincula um texto não-mapeado a um produto (cria alias + remove unmapped)
export async function linkUnmapped(productId: string, textRaw: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const norm = normalizeText(textRaw);
  const { error } = await guard.supabase
    .from("product_legend_aliases")
    .insert({
      product_id: productId,
      alias: textRaw,
      alias_normalized: norm,
      source: "unmapped_review",
    });
  if (error) return { error: error.message };

  await guard.supabase
    .from("unmapped_legends")
    .delete()
    .eq("text_normalized", norm);

  revalidatePath("/admin/legends");
  return { error: null };
}

export async function dismissUnmapped(textNormalized: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const { error } = await guard.supabase
    .from("unmapped_legends")
    .delete()
    .eq("text_normalized", textNormalized);
  if (error) return { error: error.message };

  revalidatePath("/admin/legends");
  return { error: null };
}
