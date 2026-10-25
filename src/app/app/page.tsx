import { redirect } from "next/navigation";
import { Logo } from "@/components/ui";
import { PersonaPicker } from "@/app/app/persona-picker";
import { DeleteAccount } from "@/app/app/delete-account";
import { LevelPicker } from "@/app/app/level-picker";
import { pickerLevel } from "@/lib/levels";
import { requireUser, supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DAILY_MINUTES = Number(process.env.DAILY_LIMIT_MINUTES ?? 15);

export default async function AppHome() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const supabase = await supabaseUser();

  const [{ data: profile }, { data: progress }, { data: today }] = await Promise.all([
    supabase.from("profiles").select("display_name, preferred_persona, spanish_level").eq("id", user.id).maybeSingle(),
    supabase.from("progress").select("xp_total, streak_days").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("sessions")
      .select("billed_seconds, max_seconds")
      .gte("started_at", startOfIsraelDay().toISOString()),
  ]);

  const usedSeconds = (today ?? []).reduce((s, r) => s + (r.billed_seconds ?? r.max_seconds), 0);
  const minutesLeft = Math.max(0, Math.floor(DAILY_MINUTES - usedSeconds / 60));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-surface px-3 py-1">🔥 {progress?.streak_days ?? 0}</span>
          <span className="rounded-full bg-surface px-3 py-1 text-neon-green">{progress?.xp_total ?? 0} XP</span>
        </div>
      </header>

      <div>
        <h1 className="text-2xl font-bold">¡Hola{profile?.display_name ? `, ${profile.display_name}` : ""}!</h1>
        <p className="text-muted">נשארו לך היום {minutesLeft} דקות שיחה מתוך {DAILY_MINUTES}.</p>
      </div>

      <LevelPicker initial={pickerLevel(profile?.spanish_level)} />

      <PersonaPicker initial={profile?.preferred_persona === "vale" ? "vale" : "lucia"} disabled={minutesLeft === 0} />

      <DeleteAccount />
    </div>
  );
}

function startOfIsraelDay(): Date {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
  const offsetMs = local.getTime() - now.getTime();
  local.setHours(0, 0, 0, 0);
  return new Date(local.getTime() - offsetMs);
}
