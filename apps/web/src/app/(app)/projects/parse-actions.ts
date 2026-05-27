"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { parseDxf } from "@/lib/dxf-parser";
import { parsePdf } from "@/lib/pdf-parser";
import { extractAreas, normalizeText } from "@/lib/text-utils";
import { detectProducts, type DetectionResult } from "@/lib/legend-detector";

// roda em Node runtime (unpdf não funciona em Edge)
export const runtime = "nodejs";

export type ParseResult = {
  ok: boolean;
  error?: string;
  file_type?: "dxf" | "pdf";

  // dimensões (apenas DXF)
  width_m?: number;
  height_m?: number;
  area_m2?: number;
  polygon_area_m2?: number | null;
  bbox_area_m2?: number;
  units?: string;
  entity_count?: number;

  // PDF
  pdf_pages?: number;

  // comum: áreas encontradas no texto e produtos detectados nas legendas
  found_areas?: number[];
  detected_products?: DetectionResult["matched"];
  unmapped_candidates?: string[];
};

export async function parseFloorplan(
  floorplanId: string
): Promise<ParseResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  const orgId = profile?.org_id as string | undefined;

  const { data: fp } = await supabase
    .from("floorplans")
    .select("id, project_id, file_url, file_type")
    .eq("id", floorplanId)
    .single();
  if (!fp) return { ok: false, error: "Planta não encontrada." };
  if (fp.file_type !== "dxf" && fp.file_type !== "pdf")
    return {
      ok: false,
      error: "Tipo de arquivo não suportado: " + fp.file_type,
    };

  // signed URL (RLS do usuário garante acesso)
  const { data: signed, error: signErr } = await supabase.storage
    .from("floorplans")
    .createSignedUrl(fp.file_url, 60);
  if (signErr || !signed)
    return {
      ok: false,
      error: "Falha ao gerar URL: " + (signErr?.message ?? "desconhecido"),
    };

  let buffer: ArrayBuffer;
  try {
    const res = await fetch(signed.signedUrl);
    if (!res.ok)
      return {
        ok: false,
        error: "Falha ao baixar arquivo (HTTP " + res.status + ").",
      };
    buffer = await res.arrayBuffer();
  } catch (e) {
    return {
      ok: false,
      error: "Erro de rede ao baixar: " + (e as Error).message,
    };
  }

  // ----- DXF -----
  if (fp.file_type === "dxf") {
    const text = new TextDecoder().decode(buffer);
    if (!text.includes("SECTION")) {
      return {
        ok: false,
        error:
          "Arquivo não parece ser um DXF ASCII válido. (DXF binário não é suportado.)",
      };
    }
    const parsed = parseDxf(text);
    if (parsed.entity_count === 0 && parsed.texts.length === 0)
      return {
        ok: false,
        error: "Nenhuma entidade ou texto reconhecido no arquivo.",
      };

    const detection = await detectProducts(supabase, parsed.texts);
    const foundAreas = extractAreas(parsed.texts);

    await saveResult(supabase, fp.id, fp.project_id, orgId, {
      ...parsed,
      found_areas: foundAreas,
      detected: detection,
    });

    revalidatePath("/projects/" + fp.project_id);

    return {
      ok: true,
      file_type: "dxf",
      width_m: parsed.width_m,
      height_m: parsed.height_m,
      area_m2: parsed.area_m2,
      polygon_area_m2: parsed.polygon_area_m2,
      bbox_area_m2: parsed.bbox_area_m2,
      units: parsed.units,
      entity_count: parsed.entity_count,
      found_areas: foundAreas,
      detected_products: detection.matched,
      unmapped_candidates: detection.unmapped_candidates,
    };
  }

  // ----- PDF -----
  if (fp.file_type === "pdf") {
    let parsed;
    try {
      parsed = await parsePdf(buffer);
    } catch (e) {
      return {
        ok: false,
        error:
          "Falha ao processar PDF: " +
          (e as Error).message +
          ". PDFs escaneados (imagem) não retornam texto.",
      };
    }

    // quebra o texto em tokens por linhas e por separadores comuns
    const tokens: string[] = [];
    for (const pageText of parsed.page_texts) {
      for (const line of pageText.split(/[\r\n]+/)) {
        // mantém a linha inteira (para áreas tipo "Sala 03 - 45,5 m²")
        if (line.trim()) tokens.push(line.trim());
        // e também tokens individuais para detecção de códigos
        for (const tk of line.split(/[\s,;|]+/)) {
          if (tk.trim().length >= 2) tokens.push(tk.trim());
        }
      }
    }

    const foundAreas = extractAreas(tokens);
    const detection = await detectProducts(supabase, tokens);

    await saveResult(supabase, fp.id, fp.project_id, orgId, {
      pdf_pages: parsed.pages,
      texts: tokens,
      found_areas: foundAreas,
      detected: detection,
    });

    revalidatePath("/projects/" + fp.project_id);

    return {
      ok: true,
      file_type: "pdf",
      pdf_pages: parsed.pages,
      found_areas: foundAreas,
      detected_products: detection.matched,
      unmapped_candidates: detection.unmapped_candidates,
    };
  }

  return { ok: false, error: "Tipo de arquivo desconhecido." };
}

async function saveResult(
  supabase: Awaited<ReturnType<typeof createClient>>,
  floorplanId: string,
  projectId: string,
  orgId: string | undefined,
  payload: Record<string, unknown> & { detected?: DetectionResult }
) {
  await supabase
    .from("floorplans")
    .update({ parsed_geometry: payload })
    .eq("id", floorplanId);

  // registra os candidatos não-mapeados para aprendizado futuro
  if (orgId && payload.detected?.unmapped_candidates?.length) {
    const rows = payload.detected.unmapped_candidates.map((raw) => ({
      org_id: orgId,
      project_id: projectId,
      floorplan_id: floorplanId,
      text_raw: raw,
      text_normalized: normalizeText(raw),
    }));
    // upsert-like: ignora erro de duplicação se rodar de novo
    await supabase.from("unmapped_legends").insert(rows);
  }
}

export async function applyParsedAreaToProject(
  projectId: string,
  areaM2: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("projects")
    .update({ area_m2: Math.round(areaM2 * 100) / 100 })
    .eq("id", projectId);
  if (error) return { error: error.message };

  await supabase
    .from("acoustic_analysis")
    .delete()
    .eq("project_id", projectId);
  await supabase
    .from("projects")
    .update({ status: "draft", score: null })
    .eq("id", projectId);

  revalidatePath("/projects/" + projectId);
  return { error: null };
}
