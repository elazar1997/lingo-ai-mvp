import { Check, ChevronLeft, Flame, Settings, Zap } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/ui";
import { LearningPath } from "@/app/app/learning-path";
import { LESSONS, PATH_ES } from "@/content/path-es";
import { isAdmin } from "@/lib/env";
import { lessonStates } from "@/lib/mission";
import { isBeginner } from "@/lib/personas.server";
import { requireUser, supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DAILY_MINUTES = Number(process.env.DAILY_LIMIT_MINUTES ?? 15);

export default async function AppHome() {
  const user = await requireUser();
  if (!user) redirect("/login");
  const supabase = await supabaseUser();

  const [{ data: profile }, { data: progress }, { data: today }, { data: lessonRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("spanish_level, onboarded_at, daily_goal_minutes")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("progress").select("xp_total, streak_days, last_active_date").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("sessions")
      .select("billed_seconds, max_seconds, status")
      .gte("started_at", startOfIsraelDay().toISOString()),
    supabase.from("lesson_progress").select("lesson_id, stars"),
  ]);
  if (profile && !profile.onboarded_at) redirect("/app/welcome");

  const usedSeconds = (today ?? []).reduce((s, r) => s + (r.billed_seconds ?? r.max_seconds), 0);
  const talkedMinutes = Math.floor(
    (today ?? []).reduce((s, r) => s + (r.status === "ended" ? (r.billed_seconds ?? 0) : 0), 0) / 60,
  );
  const streak = streakToShow(progress?.streak_days ?? 0, progress?.last_active_date ?? null);
  const admin = isAdmin(user.email);
  const minutesLeft = Math.max(0, Math.floor(DAILY_MINUTES - usedSeconds / 60));
  const dailyGoal = profile?.daily_goal_minutes ?? 10;
  const goalShare = Math.min(1, talkedMinutes / dailyGoal);

  const stars = Object.fromEntries((lessonRows ?? []).map((r) => [r.lesson_id, r.stars]));
  const states = lessonStates(LESSONS, stars, isBeginner(profile?.spanish_level ?? "beginner"));
  const stateById = Object.fromEntries(LESSONS.map((l, i) => [l.id, states[i]]));

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="glass-strong sticky top-2 z-20 flex flex-col gap-3 rounded-[var(--radius-card)] px-4 py-3">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2 font-display font-semibold">
            <span className={`flex items-center gap-1 rounded-full bg-white/8 px-3 py-1 ${streak ? "text-gold" : "text-muted"}`}>
              <Flame className="size-4" fill={streak ? "currentColor" : "none"} />
              {streak}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/8 px-3 py-1 text-neon-green" dir="ltr">
              <Zap className="size-4" fill="currentColor" />
              {progress?.xp_total ?? 0}
            </span>
            <Link href="/app/settings" aria-label="הגדרות" className="rounded-full bg-white/8 p-1.5 text-muted">
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-small text-muted">
            <span className="flex items-center gap-1">
              יעד יומי: {Math.min(talkedMinutes, dailyGoal)}/{dailyGoal} דקות
              {goalShare >= 1 && <Check className="size-3.5 text-neon-green" strokeWidth={3} />}
            </span>
            <span>{admin ? "מצב בדיקה: בלי מגבלה" : `נשארו ${minutesLeft} דקות היום`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="glow-green h-full rounded-full bg-neon-green transition-all" style={{ width: `${goalShare * 100}%` }} />
          </div>
        </div>
      </header>

      <LearningPath units={PATH_ES} states={stateById} stars={stars} disabled={!admin && minutesLeft === 0} />

      <Link
        href="/app/free"
        className="btn-3d glass flex items-center gap-3 rounded-[var(--radius-card)] p-4"
      >
        <div className="flex -space-x-4 space-x-reverse">
          <Avatar persona="lucia" state="idle" size={44} />
          <Avatar persona="vale" state="idle" size={44} />
        </div>
        <span className="flex flex-col">
          <span className="font-display font-semibold">שיחה חופשית</span>
          <span className="text-small text-muted">בלי משימה, על מה שבא לך</span>
        </span>
        <ChevronLeft className="mr-auto size-5 text-muted" />
      </Link>
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

// A streak still counts until the end of the day after the last call (Israel days).
function streakToShow(days: number, lastActive: string | null): number {
  if (!lastActive) return 0;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  return lastActive >= yesterday ? days : 0;
}
