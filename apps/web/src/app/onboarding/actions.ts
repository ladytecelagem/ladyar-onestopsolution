"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createOrg(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_org_and_join", {
        org_name: String(formData.get("org_name")),
  });
    if (error) redirect("/onboarding?error=" + encodeURIComponent(error.message));

  redirect("/dashboard");
}
