"use client";

import { Flame, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui";
import { findLesson } from "@/content/path-es";
import { LEVELS } from "@/lib/levels";
import type { StoredFeedback } from "@/lib/tutor";

type Ready = { feedback: StoredFeedback; progress: { xp_total: number; streak_days: number } | null };

// The tutor usually needs 5-20 seconds after the call; give up after about a minute.
const POLL_MS = 2500;
const MAX_POLLS = 24;

export function SummaryView({ sessionId }: { sessionId: string }) {
  const [result, setResult] = useState<Ready | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let polls = 0;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const res = await fetch(`/api/feedback/${sessionId}`, { cache: "no-store" }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => null) : null;
      if (stopped) return;
      if (data?.status === "ready") return setResult({ feedback: data.feedback, progress: data.progress });
      if (++polls >= MAX_POLLS) return setGaveUp(true);
      timer = setTimeout(poll, POLL_MS);
    };
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessionId]);

  if (!result) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {gaveUp ? (
          <>
            <p className="text-muted">המשוב לשיחה הזו לא מוכן כרגע. אפשר לחזור מאוחר יותר.</p>
            <HomeLink />
          </>
        ) : (
          <>
            <div className="size-10 animate-spin rounded-full border-4 border-white/10 border-t-neon-green" />
            <p className="text-muted">המורה בודקת את השיחה...</p>
          </>
        )}
      </div>
    );
  }

  const { feedback: f, progress } = result;
  const lesson = f.lesson ? findLesson(f.lesson.id) : undefined;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex flex-col items-center gap-2 pt-2 text-center">
        <p className="text-small text-muted">
          {lesson ? `שיעור: ${lesson.titleHe}` : f.placement ? "מבחן רמה" : "סיכום שיחה"} · {f.minutes} דקות
        </p>
        {lesson && f.lesson && <LessonResult stars={f.lesson.stars} />}
        <p className="font-display text-[40px] font-bold leading-none text-neon-green" dir="ltr">+{f.xp.total} XP</p>
        <p className="flex flex-wrap items-center justify-center gap-1 text-small text-muted">
          {f.xp.base} על הדקות + {f.xp.bonus} בונוס
          {f.xp.lesson ? ` + ${f.xp.lesson} על כוכבים` : ""}
          {progress && (
            <>
              {` · סה"כ ${progress.xp_total} XP · `}
              <Flame className="size-3.5 text-gold" fill="currentColor" />
              {progress.streak_days}
            </>
          )}
        </p>
      </header>

      {f.placement && (
        <Card title="הרמה שלך">
          <p className="font-display text-title font-bold text-neon-purple">
            {LEVELS.find((l) => l.id === f.placement?.level)?.labelHe}
          </p>
          <p className="text-small text-muted">עדכנו את הרמה בפרופיל. אפשר לשנות אותה בכל רגע בהגדרות.</p>
        </Card>
      )}

      {lesson && f.lesson && (
        <Card title={f.lesson.stars > 0 ? "המילים של השיעור" : `כמעט! צריך ${lesson.need} מילים והמשימה`}>
          <ul className="flex flex-wrap gap-2" dir="ltr">
            {lesson.words.map((w, i) => {
              const hit = f.lesson!.said.includes(i);
              return (
                <li
                  key={w.es}
                  className={`rounded-full px-3 py-1 font-display font-semibold ${hit ? "bg-neon-green text-bg" : "bg-white/8 text-muted line-through"}`}
                >
                  {w.es}
                </li>
              );
            })}
          </ul>
          {!f.lesson.goal_met && <p className="text-small text-muted">המשימה עוד לא הושלמה: {lesson.goalHe}</p>}
        </Card>
      )}

      <Card title="מה עשינו">
        <p>{f.summary_he}</p>
      </Card>

      {f.mistakes.length > 0 && (
        <Card title="לתקן בפעם הבאה">
          <ul className="flex flex-col gap-3">
            {f.mistakes.map((m, i) => (
              <li key={i} className="flex flex-col gap-1">
                <span dir="ltr" className="text-left">
                  <s className="text-danger">{m.said}</s> → <b className="text-neon-green">{m.correct}</b>
                </span>
                <span className="text-small text-muted">{m.why_he}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {f.new_words.length > 0 && (
        <Card title="מילים חדשות">
          <ul className="grid grid-cols-2 gap-2">
            {f.new_words.map((w, i) => (
              <li key={i} className="flex flex-col rounded-[var(--radius-btn)] bg-white/8 px-3 py-2">
                <b dir="ltr" className="text-left">
                  {w.es}
                </b>
                <span className="text-small text-muted">{w.he}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="כל הכבוד">
        <p>{f.praise_he}</p>
      </Card>
      <Card title="טיפ לשיחה הבאה">
        <p>{f.tip_he}</p>
      </Card>

      <div className="mt-auto flex flex-col gap-3">
        {lesson && f.lesson && f.lesson.stars === 0 && (
          <ButtonLink tone="green" glow href={`/app/call?lesson=${lesson.id}`}>
            לנסות שוב
          </ButtonLink>
        )}
        <HomeLink label={lesson || f.placement ? "המשך במסלול" : undefined} />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass flex flex-col gap-2 rounded-[var(--radius-card)] p-4">
      <h2 className="text-body font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function HomeLink({ label = "חזרה למסך הבית" }: { label?: string }) {
  return (
    <ButtonLink tone="ghost" href="/app">
      {label}
    </ButtonLink>
  );
}

// PR 3 replaces this with the full victory animation.
function LessonResult({ stars }: { stars: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="font-display text-title font-bold">{stars > 0 ? "השיעור הושלם! 🎉" : "כמעט! 💪"}</p>
      <p className="flex gap-1" aria-label={`${stars} כוכבים`}>
        {[1, 2, 3].map((i) => (
          <Star key={i} className={`size-10 ${i <= stars ? "text-gold drop-shadow-[0_0_10px_rgb(255_201_74/0.6)]" : "text-line"}`} fill="currentColor" />
        ))}
      </p>
    </div>
  );
}
