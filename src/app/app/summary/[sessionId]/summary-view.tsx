"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-neon-green" />
            <p className="text-muted">המורה בודקת את השיחה...</p>
          </>
        )}
      </div>
    );
  }

  const { feedback: f, progress } = result;
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="flex flex-col items-center gap-2 pt-2 text-center">
        <p className="text-sm text-muted">סיכום שיחה · {f.minutes} דקות</p>
        <p className="text-4xl font-bold text-neon-green">+{f.xp.total} XP</p>
        <p className="text-xs text-muted">
          {f.xp.base} על הדקות + {f.xp.bonus} בונוס
          {progress ? ` · סה"כ ${progress.xp_total} XP · 🔥 ${progress.streak_days}` : ""}
        </p>
      </header>

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
                <span className="text-sm text-muted">{m.why_he}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {f.new_words.length > 0 && (
        <Card title="מילים חדשות">
          <ul className="grid grid-cols-2 gap-2">
            {f.new_words.map((w, i) => (
              <li key={i} className="flex flex-col rounded-xl bg-surface-2 px-3 py-2">
                <b dir="ltr" className="text-left">
                  {w.es}
                </b>
                <span className="text-sm text-muted">{w.he}</span>
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

      <div className="mt-auto">
        <HomeLink />
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-surface p-4">
      <h2 className="font-bold">{title}</h2>
      {children}
    </section>
  );
}

function HomeLink() {
  return (
    <Link href="/app" className="flex h-12 w-full items-center justify-center rounded-2xl border border-line">
      חזרה למסך הבית
    </Link>
  );
}
