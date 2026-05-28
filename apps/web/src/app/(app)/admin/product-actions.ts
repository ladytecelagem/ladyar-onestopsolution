"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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

function num(v: FormDataEntryValue | null): number | null {
  const s = v ? String(v).trim() : "";
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s.length ? s : null;
}

const CATEGORIES = [
  "paineis",
  "baffles",
  "divisorias",
  "nuvens",
  "phone_booths",
  "revestimentos",
];

export async function createProduct(formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const name = str(formData.get("name"));
  const category = str(formData.get("category"));
  if (!name) return { error: "Nome é obrigatório." };
  if (category && !CATEGORIES.includes(category))
    return { error: "Categoria inválida." };

  const { error } = await guard.supabase.from("products").insert({
    org_id: null, // catálogo global
    name,
    category,
    nrc: num(formData.get("nrc")),
    coverage_m2: num(formData.get("coverage_m2")),
    price: num(formData.get("price")),
    finish: str(formData.get("finish")),
    width_m: num(formData.get("width_m")),
    height_m: num(formData.get("height_m")),
    symbol_svg_url: str(formData.get("symbol_svg_url")),
    icon_url: str(formData.get("icon_url")),
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/produtos");
  return { error: null };
}

export async function updateProduct(productId: string, formData: FormData) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const name = str(formData.get("name"));
  if (!name) return { error: "Nome é obrigatório." };

  const patch: Record<string, unknown> = {
    name,
    category: str(formData.get("category")),
    nrc: num(formData.get("nrc")),
    coverage_m2: num(formData.get("coverage_m2")),
    price: num(formData.get("price")),
    finish: str(formData.get("finish")),
    width_m: num(formData.get("width_m")),
    height_m: num(formData.get("height_m")),
  };
  // só sobrescreve URLs de asset se vierem preenchidas
  const svg = str(formData.get("symbol_svg_url"));
  const icon = str(formData.get("icon_url"));
  if (svg !== null) patch.symbol_svg_url = svg;
  if (icon !== null) patch.icon_url = icon;

  const { error } = await guard.supabase
    .from("products")
    .update(patch)
    .eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin/produtos");
  return { error: null };
}

export async function deleteProduct(productId: string) {
  const guard = await requireAdmin();
  if (!guard.ok) return { error: guard.error };

  const { error } = await guard.supabase
    .from("products")
    .delete()
    .eq("id", productId);
  if (error) return { error: error.message };

  revalidatePath("/admin/produtos");
  return { error: null };
}
