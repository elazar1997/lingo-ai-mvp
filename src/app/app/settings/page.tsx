import { ChevronLeft, ChevronRight, Mic, Target } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteAccount } from "@/app/app/delete-account";
import { LevelPicker } from "@/app/app/level-picker";
import { SoundToggle } from "@/app/app/sound-toggle";
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
    .select("spanish_level, goals, daily_goal_minutes")
    .eq("id", user.id)
    .maybeSingle();
  const goals = GOALS.filter((g) => (profile?.goals ?? []).includes(g.id));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-1 text-small text-muted">
          <ChevronRight className="size-4" />
          למסלול
        </Link>
        <h1 className="text-heading font-semibold">הגדרות</h1>
        <span className="w-12" />
      </header>

      <LevelPicker initial={pickerLevel(profile?.spanish_level)} />
      <Link href="/app/call?placement=1" className="glass flex items-center gap-3 rounded-[var(--radius-card)] p-4">
        <Mic className="size-5 text-neon-purple" />
        <span className="flex flex-1 flex-col">
          <span className="font-display font-semibold">מבחן רמה קולי</span>
          <span className="text-small text-muted">שיחה של 2 דקות עם לוסיה, והרמה מתעדכנת לבד</span>
        </span>
        <ChevronLeft className="size-5 text-muted" />
      </Link>

      <Link href="/app/welcome" className="glass flex items-center gap-3 rounded-[var(--radius-card)] p-4">
        <Target className="size-5 text-neon-green" />
        <span className="flex flex-1 flex-col">
          <span className="font-display font-semibold">מטרות, נושאים ויעד יומי</span>
          <span className="text-small text-muted">
            {goals.length ? goals.map((g) => `${g.emoji} ${g.labelHe}`).join(" · ") : "לא נבחרו מטרות"} ·{" "}
            {profile?.daily_goal_minutes ?? 10} דקות ביום
          </span>
        </span>
        <ChevronLeft className="size-5 text-muted" />
      </Link>

      <SoundToggle />

      <div className="mt-auto">
        <DeleteAccount />
      </div>
    </div>
  );
}
