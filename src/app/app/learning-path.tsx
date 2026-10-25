"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button, ButtonLink } from "@/components/ui";
import type { Lesson, Unit } from "@/content/path-es";
import type { LessonState } from "@/lib/mission";
import { PERSONAS } from "@/lib/personas";

// Horizontal offset of each node, so the path winds like a trail.
const WIND = [0, 56, 84, 56, 0, -56, -84, -56];

export function LearningPath({
  units,
  states,
  stars,
  disabled,
}: {
  units: Unit[];
  states: Record<string, LessonState>;
  stars: Record<string, number>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState<Lesson | null>(null);
  const currentRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center" });
  }, []);

  let n = 0;
  return (
    <div className="flex flex-col gap-8">
      {units.map((unit, u) => {
        const done = unit.lessons.filter((l) => states[l.id] === "done").length;
        return (
          <section key={unit.id} className="flex flex-col gap-6">
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-l from-neon-purple/30 to-surface p-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-neon-purple">יחידה {u + 1}</span>
                <span className="text-lg font-extrabold">{unit.titleHe}</span>
              </div>
              <span className="rounded-full bg-bg/60 px-3 py-1 text-sm font-bold tabular-nums" dir="ltr">
                {done}/{unit.lessons.length}
              </span>
            </div>

            <div className="flex flex-col items-center gap-5">
              {unit.lessons.map((lesson) => {
                const state = states[lesson.id] ?? "locked";
                const offset = WIND[n++ % WIND.length];
                return (
                  <div key={lesson.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
                    {state === "current" && (
                      <motion.span
                        className="absolute -top-9 z-10 whitespace-nowrap rounded-xl bg-neon-purple px-3 py-1 text-xs font-bold text-bg"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      >
                        {stars[lesson.id] === 0 ? "לנסות שוב" : "התחלה"}
                      </motion.span>
                    )}
                    <Node
                      state={state}
                      onClick={() => setOpen(lesson)}
                      buttonRef={state === "current" ? currentRef : undefined}
                      label={lesson.titleHe}
                    />
                    <Stars count={stars[lesson.id] ?? 0} dim={state !== "done"} />
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <AnimatePresence>
        {open && (
          <LessonSheet
            lesson={open}
            state={states[open.id] ?? "locked"}
            stars={stars[open.id] ?? 0}
            disabled={disabled}
            onClose={() => setOpen(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Node({
  state,
  onClick,
  buttonRef,
  label,
}: {
  state: LessonState;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  label: string;
}) {
  const look = {
    done: "bg-neon-green text-bg glow-green",
    current: "bg-neon-purple text-bg glow-purple",
    open: "bg-surface border-2 border-neon-purple text-neon-purple",
    locked: "bg-surface-2 text-muted",
  }[state];
  const icon = { done: "✓", current: "★", open: "★", locked: "🔒" }[state];
  return (
    <div className="relative">
      {state === "current" && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-neon-purple"
          animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        whileTap={{ scale: 0.92 }}
        aria-label={label}
        className={`relative flex size-[76px] items-center justify-center rounded-full text-3xl font-extrabold shadow-[0_6px_0_rgba(0,0,0,0.35)] ${look}`}
      >
        {icon}
      </motion.button>
    </div>
  );
}

function Stars({ count, dim }: { count: number; dim: boolean }) {
  if (dim && count === 0) return <span className="h-4" />;
  return (
    <span className="mt-1 flex gap-0.5 text-sm" aria-label={`${count} כוכבים`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= count ? "text-yellow-300" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

function LessonSheet({
  lesson,
  state,
  stars,
  disabled,
  onClose,
}: {
  lesson: Lesson;
  state: LessonState;
  stars: number;
  disabled: boolean;
  onClose: () => void;
}) {
  const persona = PERSONAS[lesson.persona];
  return (
    <>
      <motion.div
        className="fixed inset-0 z-30 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-label={lesson.titleHe}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md flex-col gap-4 rounded-t-3xl border-t border-line bg-surface p-5 pb-8"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-line" />
        <div className="flex items-center gap-3">
          <Avatar persona={persona.id} state="idle" size={64} />
          <div className="flex flex-col">
            <h2 className="text-xl font-extrabold">{lesson.titleHe}</h2>
            <span className="text-sm text-muted">
              עם {persona.name} · {lesson.sceneHe}
            </span>
          </div>
        </div>
        <p>
          <b className="text-neon-green">המשימה: </b>
          {lesson.goalHe}
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">
            מילים להשתמש בהן ({lesson.need} מתוך {lesson.words.length} כדי לעבור):
          </span>
          <ul className="flex flex-wrap gap-2">
            {lesson.words.map((w) => (
              <li key={w.es} className="flex flex-col rounded-xl bg-surface-2 px-3 py-1.5">
                <b dir="ltr" className="text-left">
                  {w.es}
                </b>
                <span className="text-xs text-muted">{w.he}</span>
              </li>
            ))}
          </ul>
        </div>
        {state === "locked" ? (
          <Button disabled>🔒 קודם מסיימים את השיעור הקודם</Button>
        ) : disabled ? (
          <Button disabled>נגמרו הדקות להיום</Button>
        ) : (
          <ButtonLink tone={state === "done" ? "purple" : "green"} href={`/app/call?lesson=${lesson.id}`}>
            {state === "done" ? (stars < 3 ? "לשפר כוכבים" : "לתרגל שוב") : "בואו נדבר"}
          </ButtonLink>
        )}
      </motion.div>
    </>
  );
}
