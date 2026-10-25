"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button, Logo } from "@/components/ui";
import { LEVELS, type LevelId } from "@/lib/levels";
import { DAILY_GOALS, GOALS, INTERESTS, MAX_INTERESTS, type GoalId } from "@/lib/profile-options";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Choice = LevelId | "test";
const STEPS = ["welcome", "goal", "interests", "daily", "level"] as const;

// First-run questions: why Spanish, what to talk about, how much a day, and the level
// (picked, or found by a short voice chat with Lucía). The answers shape the prompts.
export function Onboarding({
  name,
  initial,
}: {
  name: string | null;
  initial: { goal: string | null; interests: string[]; dailyGoal: number };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalId | null>((initial.goal as GoalId) ?? null);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [level, setLevel] = useState<Choice | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const current = STEPS[step];
  const canNext =
    current === "welcome" || (current === "goal" && !!goal) || current === "interests" || current === "daily" || !!level;

  function toggleInterest(id: string) {
    setInterests((list) =>
      list.includes(id) ? list.filter((i) => i !== id) : list.length < MAX_INTERESTS ? [...list, id] : list,
    );
  }

  async function finish() {
    setSaving(true);
    setError(false);
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.push("/login");
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        goal,
        interests,
        daily_goal_minutes: dailyGoal,
        // The voice test sets the real level afterwards; until then start as a beginner.
        spanish_level: level === "test" || !level ? "beginner" : level,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);
    if (dbError) {
      setError(true);
      setSaving(false);
      return;
    }
    router.push(level === "test" ? "/app/call?placement=1" : "/app");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-1.5" aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-neon-green" : i < step ? "w-2 bg-neon-green/60" : "w-2 bg-line"}`}
            />
          ))}
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.section
          key={current}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
        >
          {current === "welcome" && (
            <div className="flex flex-col items-center gap-4 pt-6 text-center">
              <div className="flex -space-x-6 space-x-reverse">
                <Avatar persona="lucia" state="idle" size={110} />
                <Avatar persona="vale" state="speaking" size={110} />
              </div>
              <h1 className="text-3xl font-extrabold">¡Hola{name ? `, ${name}` : ""}!</h1>
              <p className="text-muted">
                כאן לומדים ספרדית בדיבור אמיתי. בכל שיעור יש משימה קצרה מול לוסיה או ואלה, ובסופה מקבלים XP ומתקדמים במסלול.
              </p>
              <p className="text-muted">ארבע שאלות קצרות, ונתאים את המסלול בדיוק בשבילך.</p>
            </div>
          )}

          {current === "goal" && (
            <>
              <h1 className="text-2xl font-bold">בשביל מה הספרדית?</h1>
              <p className="-mt-2 text-sm text-muted">השיחות ואוצר המילים יותאמו למטרה.</p>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <Option key={g.id} active={goal === g.id} onClick={() => setGoal(g.id)}>
                    <span className="text-3xl">{g.emoji}</span>
                    <span className="font-bold">{g.labelHe}</span>
                  </Option>
                ))}
              </div>
            </>
          )}

          {current === "interests" && (
            <>
              <h1 className="text-2xl font-bold">על מה כיף לדבר?</h1>
              <p className="-mt-2 text-sm text-muted">עד {MAX_INTERESTS} נושאים. הדמויות יעלו אותם בשיחות.</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = interests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleInterest(i.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                        active ? "glow-purple border-transparent bg-surface text-neon-purple" : "border-line bg-surface"
                      }`}
                    >
                      {i.labelHe}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {current === "daily" && (
            <>
              <h1 className="text-2xl font-bold">כמה זמן ביום?</h1>
              <p className="-mt-2 text-sm text-muted">יעד יומי של דיבור. אפשר לשנות בכל רגע.</p>
              <div className="flex flex-col gap-3">
                {DAILY_GOALS.map((d) => (
                  <Option key={d.minutes} active={dailyGoal === d.minutes} onClick={() => setDailyGoal(d.minutes)} row>
                    <span className="text-2xl font-extrabold text-neon-green" dir="ltr">
                      {d.minutes}′
                    </span>
                    <span className="flex flex-col text-right">
                      <span className="font-bold">{d.labelHe}</span>
                      <span className="text-xs text-muted">{d.hintHe}</span>
                    </span>
                  </Option>
                ))}
              </div>
            </>
          )}

          {current === "level" && (
            <>
              <h1 className="text-2xl font-bold">מה הרמה שלך בספרדית?</h1>
              <div className="flex flex-col gap-3">
                {LEVELS.map((l) => (
                  <Option key={l.id} active={level === l.id} onClick={() => setLevel(l.id)} row>
                    <span className="flex flex-col text-right">
                      <span className="font-bold">{l.labelHe}</span>
                      <span className="text-xs text-muted">{l.hintHe}</span>
                    </span>
                  </Option>
                ))}
                <Option active={level === "test"} onClick={() => setLevel("test")} row>
                  <Avatar persona="lucia" state="idle" size={48} />
                  <span className="flex flex-col text-right">
                    <span className="font-bold">לא בטוחים? מבחן רמה קולי</span>
                    <span className="text-xs text-muted">שיחה של 2 דקות עם לוסיה, והרמה נקבעת אוטומטית</span>
                  </span>
                </Option>
              </div>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      {error && <p className="text-center text-sm text-danger">השמירה נכשלה. אפשר לנסות שוב.</p>}

      <div className="mt-auto flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="h-12 rounded-2xl border border-line px-5">
            חזרה
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <Button tone="green" disabled={!canNext} onClick={() => setStep(step + 1)}>
            {current === "welcome" ? "יאללה, מתחילים" : current === "interests" && interests.length === 0 ? "דילוג" : "הבא"}
          </Button>
        ) : (
          <Button tone="green" disabled={!canNext || saving} onClick={finish}>
            {saving ? "שומרים..." : level === "test" ? "למבחן הרמה" : "למסלול שלי"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Option({
  active,
  onClick,
  row,
  children,
}: {
  active: boolean;
  onClick: () => void;
  row?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex gap-3 rounded-2xl border bg-surface p-4 transition active:scale-[0.98] ${
        row ? "items-center" : "flex-col items-center text-center"
      } ${active ? "glow-green border-transparent" : "border-line"}`}
    >
      {children}
    </button>
  );
}
