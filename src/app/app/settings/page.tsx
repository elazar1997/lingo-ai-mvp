import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccount } from "@/app/app/delete-account";
import { LevelPicker } from "@/app/app/level-picker";
import { pickerLevel } from "@/lib/levels";
import { GOALS } from "@/lib/profile-options";
import { requireUser, supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const supabase = await supabaseUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("spanish_level, goal, daily_goal_minutes")
    .eq("id", user.id)
    .maybeSingle();
  const goal = GOALS.find((g) => g.id === profile?.goal);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href="/app" className="text-sm text-muted">
          → למסלול
        </Link>
        <h1 className="font-bold">הגדרות</h1>
        <span className="w-12" />
      </header>

      <LevelPicker initial={pickerLevel(profile?.spanish_level)} />
      <Link href="/app/call?placement=1" className="-mt-3 text-sm text-neon-purple underline">
        לא בטוחים? מבחן רמה קולי של 2 דקות
      </Link>

      <section className="flex items-center justify-between rounded-2xl bg-surface p-4">
        <div className="flex flex-col">
          <span className="font-bold">מטרה, נושאים ויעד יומי</span>
          <span className="text-xs text-muted">
            {goal ? `${goal.emoji} ${goal.labelHe}` : "לא נבחרה מטרה"} · {profile?.daily_goal_minutes ?? 10} דקות ביום
          </span>
        </div>
        <Link href="/app/welcome" className="rounded-xl border border-line px-3 py-2 text-sm">
          לשנות
        </Link>
      </section>

      <div className="mt-auto">
        <DeleteAccount />
      </div>
    </div>
  );
}
