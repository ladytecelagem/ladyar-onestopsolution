"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createOrg(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ name: String(formData.get("org_name")) })
    .select("id")
    .single();
  if (error) redirect("/onboarding?error=" + encodeURIComponent(error.message));

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ org_id: org.id, role: "owner" })
    .eq("id", user.id);
  if (pErr) redirect("/onboarding?error=" + encodeURIComponent(pErr.message));

  redirect("/dashboard");
}
