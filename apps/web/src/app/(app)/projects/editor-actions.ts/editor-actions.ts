"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CanvasState } from "@/lib/editor-types";

export async function saveCanvasState(
  projectId: string,
  state: CanvasState
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado." };

  const { error } = await supabase
    .from("projects")
    .update({ canvas_state: state })
    .eq("id", projectId);
  if (error) return { error: error.message };

  revalidatePath("/projects/" + projectId);
  return { error: null };
}
