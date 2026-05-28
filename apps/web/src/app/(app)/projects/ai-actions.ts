"use server";

import { createClient } from "@/lib/supabase/server";
import { generate } from "@/lib/ai";
import { revalidatePath } from "next/cache";

async function loadContext(projectId: string) {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select("id, name, room_type, area_m2, briefing")
      .eq("id", projectId)
      .single();
    const { data: analysis } = await supabase
      .from("acoustic_analysis")
      .select("rt60_before, rt60_after, score_before, score_after, recommendations")
      .eq("project_id", projectId)
      .maybeSingle();
    return { project, analysis };
}

export async function generateDescription(projectId: string): Promise<string> {
    const { project, analysis } = await loadContext(projectId);
    if (!project) throw new Error("Projeto nao encontrado");
    const ctx = JSON.stringify({ project, analysis }, null, 2);
    const text = await generate(
          "Voce e um especialista em acustica arquitetonica da Lady Tecelagem. Escreva em portugues brasileiro, tom profissional, objetivo e claro. Nunca invente dados.",
          `Gere uma descricao comercial (3-5 paragrafos) para o projeto a seguir, voltada ao cliente final. Destaque o tipo de ambiente, o desafio acustico e a proposta de solucao com produtos Lady.\n\nCONTEXTO:\n${ctx}`,
          1500,
        );
    const supabase = await createClient();
    await supabase
      .from("projects")
      .update({ ai_description: text, ai_updated_at: new Date().toISOString() })
      .eq("id", projectId);
    revalidatePath(`/projects/${projectId}`);
    return text;
}

export async function generateJustification(projectId: string): Promise<string> {
    const { project, analysis } = await loadContext(projectId);
    if (!project) throw new Error("Projeto nao encontrado");
    const ctx = JSON.stringify({ project, analysis }, null, 2);
    const text = await generate(
          "Voce e um engenheiro acustico. Escreva memorial tecnico em portugues brasileiro: linguagem tecnica mas legivel por leigos. Nunca invente dados.",
          `Gere uma justificativa tecnica resumida (4-6 paragrafos) para a analise abaixo. Explique RT60 antes/depois pelo calculo de Sabine, impacto da area de tratamento proposta e adequacao das recomendacoes ao tipo de ambiente.\n\nCONTEXTO:\n${ctx}`,
          1800,
        );
    const supabase = await createClient();
    await supabase
      .from("projects")
      .update({ ai_justification: text, ai_updated_at: new Date().toISOString() })
      .eq("id", projectId);
    revalidatePath(`/projects/${projectId}`);
    return text;
}
