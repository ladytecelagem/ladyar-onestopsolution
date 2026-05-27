"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registerFloorplan(
  projectId: string,
  filePath: string,
  fileType: "dxf" | "pdf"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase.from("floorplans").insert({
    project_id: projectId,
    file_url: filePath,
    file_type: fileType,
  });
  if (error) return { error: error.message };

  // marca o projeto como processando
  await supabase
    .from("projects")
    .update({ status: "processing" })
    .eq("id", projectId);

  revalidatePath("/projects/" + projectId);
  return { error: null };
}

export async function getFloorplanUrl(filePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("floorplans")
    .createSignedUrl(filePath, 3600);
  if (error) return { url: null, error: error.message };
  return { url: data.signedUrl, error: null };
}

export async function deleteFloorplan(
  floorplanId: string,
  filePath: string,
  projectId: string
) {
  const supabase = await createClient();
  await supabase.storage.from("floorplans").remove([filePath]);
  const { error } = await supabase
    .from("floorplans")
    .delete()
    .eq("id", floorplanId);
  if (error) return { error: error.message };
  revalidatePath("/projects/" + projectId);
  return { error: null };
}
