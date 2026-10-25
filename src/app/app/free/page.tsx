import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PersonaPicker } from "@/app/app/persona-picker";
import { isAdmin } from "@/lib/env";
import { requireUser, supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FreeTalkPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const supabase = await supabaseUser();
  const { data: profile } = await supabase.from("profiles").select("preferred_persona").eq("id", user.id).maybeSingle();
  // The session route enforces the daily quota; the button just starts the call.
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-1 text-small text-muted">
          <ChevronRight className="size-4" />
          למסלול
        </Link>
        <h1 className="text-heading font-semibold">שיחה חופשית</h1>
        <span className="w-12" />
      </header>
      <PersonaPicker initial={profile?.preferred_persona === "vale" ? "vale" : "lucia"} disabled={false} />
      {isAdmin(user.email) && <p className="text-center text-small text-muted">מצב בדיקה: אין מגבלת דקות יומית.</p>}
    </div>
  );
}
