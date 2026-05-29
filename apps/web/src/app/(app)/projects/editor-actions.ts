"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeRoomWithCanvas,
  type RoomType,
  type Briefing,
} from "@/lib/acoustics";
import type { CanvasState } from "@/lib/editor-types";

export async function saveCanvasState(
  projectId: string,
  state: CanvasState
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("projects")
    .update({ canvas_state: state })
    .eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/projects/" + projectId);
  return { error: null };
}

// Calcula RT60 e custo usando o que está posicionado no canvas.
// Salva em acoustic_analysis e atualiza projects.status/score.
export async function runCanvasAnalysis(
  projectId: string,
  state: CanvasState
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { data: project } = await supabase
    .from("projects")
    .select("id, room_type, area_m2, briefing")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Projeto não encontrado." };
  if (!project.area_m2 || project.area_m2 <= 0)
    return {
      error: "Defina a área do projeto antes de calcular.",
    };
  if (!project.room_type)
    return {
      error: "Defina o tipo de ambiente antes de calcular.",
    };

  const briefing = (project.briefing as Briefing | null) ?? null;
  const elements = state?.elements ?? [];

  if (elements.length === 0) {
    return {
      error:
        "Posicione ao menos um produto na planta antes de calcular.",
    };
  }

  const result = analyzeRoomWithCanvas(
    project.area_m2,
    project.room_type as RoomType,
    briefing,
    elements
  );

  const totalCost = elements.reduce(
    (sum, el) => sum + (el.price ?? 0),
    0
  );

  const recommendations = {
    from_canvas: true,
    target_area_m2: result.treated_area_m2,
    used_briefing: result.used_briefing,
    total_cost: totalCost,
    items_count: elements.length,
    items: elements.map((el) => ({
      product_id: el.product_id,
      name: el.name,
      area_m2: (el.w_m ?? 0) * (el.h_m ?? 0),
      nrc: el.nrc,
      price: el.price,
    })),
  };

  await supabase
    .from("acoustic_analysis")
    .delete()
    .eq("project_id", projectId);

  const { error } = await supabase
    .from("acoustic_analysis")
    .insert({
      project_id: projectId,
      rt60_before: result.rt60_before,
      rt60_after: result.rt60_after,
      score_before: result.score_before,
      score_after: result.score_after,
      recommendations,
    });
  if (error) return { error: error.message };

  await supabase
    .from("projects")
    .update({ status: "analyzed", score: result.score_after })
    .eq("id", projectId);

  revalidatePath("/projects/" + projectId);
  revalidatePath("/dashboard");

  return {
    error: null,
    result: {
      rt60_before: result.rt60_before,
      rt60_after: result.rt60_after,
      rt60_target: result.rt60_target,
      score_before: result.score_before,
      score_after: result.score_after,
      treated_area_m2: result.treated_area_m2,
      volume_m3: result.volume_m3,
      used_briefing: result.used_briefing,
      total_cost: totalCost,
      items_count: elements.length,
    },
  };
}
