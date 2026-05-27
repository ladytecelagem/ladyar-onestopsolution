// Detector de produtos por legenda em plantas
//
// Estratégia: a tabela product_legend_aliases mapeia textos (aliases) para
// produtos. Como cada cliente usa um padrão diferente, o matching é tolerante:
// - texto extraído é normalizado (sem espaços/hifens/acentos, lowercase)
// - alias_normalized da tabela é comparado por igualdade exata e por
//   substring (token longo do alias deve aparecer no texto)
//
// O sistema começa vazio. Cada novo alias cadastrado expande a detecção.

import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeText } from "./text-utils";

export type DetectedProduct = {
  product_id: string;
  product_name: string;
  category: string | null;
  matched_aliases: string[]; // textos da planta que casaram
  count: number; // quantas ocorrências
};

export type DetectionResult = {
  matched: DetectedProduct[];
  unmapped_candidates: string[]; // textos que parecem códigos mas não casaram
};

// heurística: texto "parece" um código de produto se:
// - tem 2-25 chars depois de normalizar
// - contém letras + dígitos (códigos típicos), ou hífen entre letras
// - não é uma palavra comum (e/de/etc) nem só número (cota)
const COMMON_WORDS = new Set([
  "sala",
  "area",
  "piso",
  "teto",
  "porta",
  "janela",
  "escala",
  "planta",
  "corte",
  "nivel",
  "norte",
  "sul",
  "leste",
  "oeste",
  "obra",
]);

function looksLikeCode(raw: string): boolean {
  const norm = normalizeText(raw);
  if (norm.length < 2 || norm.length > 25) return false;
  if (/^\d+$/.test(norm)) return false; // só número = cota
  if (COMMON_WORDS.has(norm)) return false;
  const hasLetter = /[a-z]/.test(norm);
  const hasDigit = /\d/.test(norm);
  // letras+dígitos (PA60) ou texto com hífen (BAFFLE-V)
  return (hasLetter && hasDigit) || /-/.test(raw);
}

export async function detectProducts(
  supabase: SupabaseClient,
  texts: string[]
): Promise<DetectionResult> {
  if (texts.length === 0)
    return { matched: [], unmapped_candidates: [] };

  // carrega todos os aliases — base costuma ser pequena, vale prefetch
  const { data: aliases } = await supabase
    .from("product_legend_aliases")
    .select(
      "alias, alias_normalized, product_id, products!inner(id, name, category)"
    );

  type AliasRow = {
    alias: string;
    alias_normalized: string;
    product_id: string;
    products: { id: string; name: string; category: string | null };
  };
  const rows = (aliases as AliasRow[] | null) ?? [];

  const byProduct = new Map<string, DetectedProduct>();

  // textos da planta normalizados (mantém referência ao raw para reporte)
  const normTexts = texts.map((t) => ({ raw: t, norm: normalizeText(t) }));

  const unmappedSet = new Set<string>();

  // 1. matching contra os aliases
  for (const t of normTexts) {
    if (!t.norm) continue;
    let didMatch = false;

    for (const row of rows) {
      const an = row.alias_normalized;
      if (!an) continue;
      // match: igualdade OU substring (alias contido no texto, p/ pegar "PA60-CLIENTEX")
      if (t.norm === an || (an.length >= 3 && t.norm.includes(an))) {
        const key = row.product_id;
        const existing = byProduct.get(key);
        if (existing) {
          existing.count++;
          if (!existing.matched_aliases.includes(t.raw))
            existing.matched_aliases.push(t.raw);
        } else {
          byProduct.set(key, {
            product_id: row.product_id,
            product_name: row.products.name,
            category: row.products.category,
            matched_aliases: [t.raw],
            count: 1,
          });
        }
        didMatch = true;
      }
    }

    // se o texto parece código e não casou com nada → candidato de aprendizado
    if (!didMatch && looksLikeCode(t.raw)) {
      unmappedSet.add(t.raw);
    }
  }

  return {
    matched: Array.from(byProduct.values()).sort(
      (a, b) => b.count - a.count
    ),
    unmapped_candidates: Array.from(unmappedSet).slice(0, 20), // limita listagem
  };
}
