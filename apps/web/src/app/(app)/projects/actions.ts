"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

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
