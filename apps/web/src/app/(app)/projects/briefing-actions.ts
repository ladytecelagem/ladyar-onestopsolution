"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Briefing } from "@/lib/acoustics";

function str(v: FormDataEntryValue | null): string | undefined {
  const s = v ? String(v).trim() : "";
  return s.length ? s : undefined;
}

export async function saveBriefing(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const heightRaw = str(formData.get("ceiling_height_m"));
  const occRaw = str(formData.get("occupancy"));

  const briefing: Briefing = {
    ceiling_height_m: heightRaw ? Number(heightRaw) : undefined,
    floor: str(formData.get("floor")) as Briefing["floor"],
    walls: str(formData.get("walls")) as Briefing["walls"],
    ceiling: str(formData.get("ceiling")) as Briefing["ceiling"],
    occupancy: occRaw ? Number(occRaw) : undefined,
    usage: str(formData.get("usage")) as Briefing["usage"],
    complaint: str(formData.get("complaint")) as Briefing["complaint"],
    budget: str(formData.get("budget")) as Briefing["budget"],
  };

  const { error } = await supabase
    .from("projects")
    .update({ briefing })
    .eq("id", projectId);
  if (error)
    redirect(
      "/projects/" + projectId + "/briefing?error=" +
        encodeURIComponent(error.message)
    );

  // briefing mudou: a análise existente ficou desatualizada
  await supabase
    .from("acoustic_analysis")
    .delete()
    .eq("project_id", projectId);
  await supabase
    .from("projects")
    .update({ status: "draft", score: null })
    .eq("id", projectId);

  revalidatePath("/projects/" + projectId);
  redirect("/projects/" + projectId);
}
