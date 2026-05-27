import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../(auth)/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, full_name, is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.org_id) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link href="/dashboard" className="text-sm font-medium tracking-[0.15em]">
          LADY<span className="text-gold">·AR</span>
        </Link>
        <div className="flex items-center gap-4 text-xs text-muted">
          {profile.is_admin && (
            <Link
              href="/admin/legends"
              className="rounded-md border border-gold px-3 py-1 text-gold hover:bg-gold hover:text-ink"
            >
              Admin
            </Link>
          )}
          <span>{profile.full_name ?? user.email}</span>
          <form action={signout}>
            <button className="rounded-md border border-border px-3 py-1 hover:text-paper">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}
