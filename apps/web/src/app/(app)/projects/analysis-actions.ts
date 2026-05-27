"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  analyzeRoom,
  recommendedCategory,
  type RoomType,
  type Briefing,
} from "@/lib/acoustics";

export async function runAnalysis(projectId: string) {
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
    return { error: "Defina a área do projeto antes de analisar." };
  if (!project.room_type)
    return { error: "Defina o tipo de ambiente antes de analisar." };

  const briefing = (project.briefing as Briefing | null) ?? null;

  const result = analyzeRoom(
    project.area_m2,
    project.room_type as RoomType,
    briefing
  );

  // categoria recomendada: tipo de ambiente, podendo ser sobreposta pela queixa
  const category = recommendedCategory(
    project.room_type as RoomType,
    briefing
  );
  const { data: products } = await supabase
    .from("products")
    .select("id, name, nrc, price, coverage_m2, category")
    .eq("category", category)
    .limit(3);

  const recommendations = {
    category,
    target_area_m2: result.treated_area_m2,
    used_briefing: result.used_briefing,
    products: products ?? [],
  };

  await supabase
    .from("acoustic_analysis")
    .delete()
    .eq("project_id", projectId);

  const { error } = await supabase.from("acoustic_analysis").insert({
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
  return { error: null };
}
