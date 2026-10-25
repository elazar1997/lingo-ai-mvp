"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button, Logo } from "@/components/ui";
import { LEVELS, type LevelId } from "@/lib/levels";
import { DAILY_GOALS, GOALS, INTERESTS, MAX_INTERESTS, type GoalId } from "@/lib/profile-options";
import { playSfx } from "@/lib/sfx";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { PlacementQuiz } from "./placement-quiz";

type Choice = LevelId | "quiz";
const STEPS = ["welcome", "goal", "interests", "daily", "level"] as const;

// First-run questions: why Spanish (several answers), what to talk about, how much a day,
// and the level: picked, or found by a short visual quiz. The answers shape the prompts.
export function Onboarding({
  name,
  initial,
}: {
  name: string | null;
  initial: { goals: string[]; interests: string[]; dailyGoal: number };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<GoalId[]>(initial.goals as GoalId[]);
  const [interests, setInterests] = useState<string[]>(initial.interests);
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [level, setLevel] = useState<Choice | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const current = STEPS[step];
  const canNext =
    current === "welcome" || (current === "goal" && goals.length > 0) || current === "interests" || current === "daily" || !!level;

  function toggle<T>(list: T[], id: T, max = Infinity) {
    return list.includes(id) ? list.filter((i) => i !== id) : list.length < max ? [...list, id] : list;
  }

  async function finish(chosen: LevelId) {
    setSaving(true);
    setError(false);
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return router.push("/login");
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        goals,
        // The single goal column is still read by older code.
        goal: goals[0] ?? null,
        interests,
        daily_goal_minutes: dailyGoal,
        spanish_level: chosen,
        onboarded_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);
    if (dbError) {
      setError(true);
      setSaving(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  if (quiz) {
    return (
      <div className="flex flex-1 flex-col gap-4">
        <PlacementQuiz onDone={finish} onSkip={() => finish("beginner")} />
        {error && <p className="text-center text-small text-danger">השמירה נכשלה. אפשר לנסות שוב.</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-1.5" aria-label={`שלב ${step + 1} מתוך ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-2 rounded-full transition-all ${i === step ? "w-6 bg-neon-green" : i < step ? "w-2 bg-neon-green/60" : "w-2 bg-white/15"}`}
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
              <h1 className="text-title font-bold">¡Hola{name ? `, ${name}` : ""}!</h1>
              <p className="text-muted">
                כאן לומדים ספרדית בדיבור אמיתי. בכל שיעור יש משימה קצרה מול לוסיה או ואלה, ובסופה מקבלים XP ומתקדמים במסלול.
              </p>
              <p className="text-muted">כמה שאלות קצרות, ונתאים את המסלול בדיוק בשבילך.</p>
            </div>
          )}

          {current === "goal" && (
            <>
              <h1 className="text-title font-bold">בשביל מה הספרדית?</h1>
              <p className="-mt-2 text-small text-muted">אפשר לבחור כמה. השיחות ואוצר המילים יותאמו למטרות.</p>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => {
                  const active = goals.includes(g.id);
                  return (
                    <Option key={g.id} active={active} onClick={() => (playSfx("tap"), setGoals((l) => toggle(l, g.id)))}>
                      {active && <Check className="absolute left-3 top-3 size-4 text-neon-green" strokeWidth={3} />}
                      <span className="text-4xl">{g.emoji}</span>
                      <span className="font-display font-semibold">{g.labelHe}</span>
                    </Option>
                  );
                })}
              </div>
            </>
          )}

          {current === "interests" && (
            <>
              <h1 className="text-title font-bold">על מה כיף לדבר?</h1>
              <p className="-mt-2 text-small text-muted">עד {MAX_INTERESTS} נושאים. הדמויות יעלו אותם בשיחות.</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = interests.includes(i.id);
                  return (
                    <button
                      key={i.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => (playSfx("tap"), setInterests((l) => toggle(l, i.id, MAX_INTERESTS)))}
                      className={`rounded-full border px-4 py-2 font-display font-medium transition active:scale-95 ${
                        active ? "glow-purple border-transparent bg-neon-purple/20 text-ink" : "glass"
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
              <h1 className="text-title font-bold">כמה זמן ביום?</h1>
              <p className="-mt-2 text-small text-muted">יעד יומי של דיבור. אפשר לשנות בכל רגע.</p>
              <div className="flex flex-col gap-3">
                {DAILY_GOALS.map((d) => (
                  <Option key={d.minutes} active={dailyGoal === d.minutes} onClick={() => setDailyGoal(d.minutes)} row>
                    <span className="w-12 font-display text-title font-bold text-neon-green" dir="ltr">
                      {d.minutes}′
                    </span>
                    <span className="flex flex-col text-right">
                      <span className="font-display font-semibold">{d.labelHe}</span>
                      <span className="text-small text-muted">{d.hintHe}</span>
                    </span>
                  </Option>
                ))}
              </div>
            </>
          )}

          {current === "level" && (
            <>
              <h1 className="text-title font-bold">מה הרמה בספרדית?</h1>
              <div className="flex flex-col gap-3">
                <Option active={level === "quiz"} onClick={() => setLevel("quiz")} row>
                  <span className="flex size-11 items-center justify-center rounded-full bg-neon-purple/20 text-neon-purple">
                    <Sparkles className="size-5" />
                  </span>
                  <span className="flex flex-col text-right">
                    <span className="font-display font-semibold">לא בטוחים? מבחן רמה קצר</span>
                    <span className="text-small text-muted">עד 10 שאלות עם תמונות ומילים, בלי לדבר</span>
                  </span>
                </Option>
                {LEVELS.map((l) => (
                  <Option key={l.id} active={level === l.id} onClick={() => setLevel(l.id)} row>
                    <span className="flex flex-col text-right">
                      <span className="font-display font-semibold">{l.labelHe}</span>
                      <span className="text-small text-muted">{l.hintHe}</span>
                    </span>
                  </Option>
                ))}
              </div>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      {error && <p className="text-center text-small text-danger">השמירה נכשלה. אפשר לנסות שוב.</p>}

      <div className="mt-auto flex gap-3">
        {step > 0 && (
          <Button tone="ghost" className="!w-auto px-4" aria-label="חזרה" onClick={() => setStep(step - 1)}>
            <ChevronRight className="size-5" />
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button tone="green" glow disabled={!canNext} onClick={() => setStep(step + 1)}>
            {current === "welcome" ? "יאללה, מתחילים" : current === "interests" && interests.length === 0 ? "דילוג" : "הבא"}
          </Button>
        ) : (
          <Button
            tone="green"
            glow
            disabled={!canNext || saving}
            onClick={() => (level === "quiz" ? setQuiz(true) : level && finish(level))}
          >
            {saving ? "שומרים..." : level === "quiz" ? "למבחן" : "למסלול שלי"}
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
      className={`btn-3d glass relative flex gap-3 rounded-[var(--radius-card)] p-4 ${
        row ? "items-center" : "flex-col items-center text-center"
      } ${active ? "glow-green !border-transparent !bg-neon-green/10" : ""}`}
    >
      {children}
    </button>
  );
}
