"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) redirect("/onboarding");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      org_id: profile.org_id,
      created_by: user.id,
      name: String(formData.get("name")),
      room_type: String(formData.get("room_type")),
      area_m2: formData.get("area_m2")
        ? Number(formData.get("area_m2"))
        : null,
    })
    .select("id")
    .single();
  if (error) redirect("/projects/new?error=" + encodeURIComponent(error.message));

  redirect("/projects/" + project.id);
}

export async function updateProject(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const newArea = formData.get("area_m2")
    ? Number(formData.get("area_m2"))
    : null;

  // se mudou área ou tipo, a análise existente fica obsoleta
  const { data: current } = await supabase
    .from("projects")
    .select("area_m2, room_type, status")
    .eq("id", projectId)
    .single();

  const newType = String(formData.get("room_type"));
  const changedInputs =
    !!current &&
    (current.area_m2 !== newArea || current.room_type !== newType);

  const { error } = await supabase
    .from("projects")
    .update({
      name: String(formData.get("name")),
      room_type: newType,
      area_m2: newArea,
    })
    .eq("id", projectId);
  if (error)
    redirect(
      "/projects/" + projectId + "/edit?error=" +
        encodeURIComponent(error.message)
    );

  // dados de entrada mudaram: limpa análise antiga e volta status p/ rascunho
  if (changedInputs) {
    await supabase
      .from("acoustic_analysis")
      .delete()
      .eq("project_id", projectId);
    await supabase
      .from("projects")
      .update({ status: "draft", score: null })
      .eq("id", projectId);
  }

  revalidatePath("/projects/" + projectId);
  revalidatePath("/dashboard");
  redirect("/projects/" + projectId);
}

export async function setArchived(projectId: string, archived: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("projects")
    .update({ archived })
    .eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/projects/" + projectId);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  // floorplans, acoustic_analysis, renders e proposals saem via FK on delete cascade.
  // arquivos no Storage são removidos antes (não cascateiam do banco).
  const { data: floorplans } = await supabase
    .from("floorplans")
    .select("file_url")
    .eq("project_id", projectId);

  if (floorplans && floorplans.length > 0) {
    await supabase.storage
      .from("floorplans")
      .remove(floorplans.map((f) => f.file_url));
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { error: null };
}
