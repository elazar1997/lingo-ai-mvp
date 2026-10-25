"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Coffee, Gift, Globe, Hand, Lock, Receipt, Smile, Star, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button, ButtonLink } from "@/components/ui";
import { WordChip } from "@/components/word-chip";
import type { Lesson, Unit } from "@/content/path-es";
import type { LessonState } from "@/lib/mission";
import { PERSONAS } from "@/lib/personas";

// The map: lessons are 3D coins on a dotted trail that winds down the screen, with the
// unit's treasure chest at the end. Positions are computed so the trail can be drawn in SVG.
const MAP_W = 300;
const ROW = 150;
const COIN = 80;
const WIND = [0, 64, 84, 40, -24, -72, -60, -8];

const LESSON_ICONS: Record<string, LucideIcon> = {
  "u1-hello": Hand,
  "u1-from": Globe,
  "u1-how": Smile,
  "u2-coffee": Coffee,
  "u2-food": UtensilsCrossed,
  "u2-bill": Receipt,
};

type Point = { x: number; y: number };

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
    <div className="flex flex-col gap-6">
      {units.map((unit, u) => {
        const done = unit.lessons.filter((l) => states[l.id] === "done").length;
        const complete = done === unit.lessons.length;
        // One point per lesson, then one for the chest.
        const points: Point[] = [...unit.lessons, null].map((_, i) => ({
          x: MAP_W / 2 + WIND[n++ % WIND.length],
          y: ROW * i + ROW / 2,
        }));
        n--; // the chest does not use up a wind slot
        const height = ROW * points.length;
        return (
          <section key={unit.id} className="flex flex-col gap-4">
            <div className="glass flex items-center justify-between rounded-[var(--radius-card)] bg-gradient-to-l from-neon-purple/25 to-transparent p-4">
              <div className="flex flex-col">
                <span className="text-small font-medium text-neon-purple">יחידה {u + 1}</span>
                <span className="font-display text-heading font-semibold">{unit.titleHe}</span>
              </div>
              <span className="rounded-full bg-black/30 px-3 py-1 font-display font-semibold tabular-nums" dir="ltr">
                {done}/{unit.lessons.length}
              </span>
            </div>

            <div className="relative mx-auto" style={{ width: MAP_W, height }}>
              <Trail points={points} doneUpTo={done} />
              {unit.lessons.map((lesson, i) => {
                const state = states[lesson.id] ?? "locked";
                const p = points[i];
                const side = p.x >= MAP_W / 2 ? -1 : 1;
                return (
                  <div key={lesson.id}>
                    <div className="absolute" style={{ left: p.x - COIN / 2, top: p.y - COIN / 2 }}>
                      {state === "current" && (
                        <motion.span
                          className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 font-display text-small font-bold text-neon-purple shadow-[0_3px_0_rgb(0_0_0/0.25)] after:absolute after:-bottom-1.5 after:left-1/2 after:size-3 after:-translate-x-1/2 after:rotate-45 after:bg-white"
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {stars[lesson.id] === 0 ? "לנסות שוב" : "התחלה"}
                        </motion.span>
                      )}
                      <Coin
                        state={state}
                        Icon={LESSON_ICONS[lesson.id] ?? Star}
                        onClick={() => setOpen(lesson)}
                        buttonRef={state === "current" ? currentRef : undefined}
                        label={lesson.titleHe}
                      />
                      <Stars count={stars[lesson.id] ?? 0} dim={state !== "done"} />
                    </div>
                    {state === "current" && (
                      <motion.div
                        className="absolute"
                        style={{ left: p.x + side * 78 - 24, top: p.y - 30 }}
                        initial={{ opacity: 0, x: side * -12 }}
                        animate={{ opacity: 1, x: 0, rotate: side * -8 }}
                        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 18 }}
                      >
                        <Avatar persona={lesson.persona} state="idle" size={48} />
                      </motion.div>
                    )}
                  </div>
                );
              })}
              <Chest point={points[points.length - 1]} open={complete} />
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

// Dotted trail through the coin centres; the part already walked is green.
function Trail({ points, doneUpTo }: { points: Point[]; doneUpTo: number }) {
  const seg = (a: Point, b: Point) => {
    const my = (a.y + b.y) / 2;
    return `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
  };
  return (
    <svg className="absolute inset-0" width={MAP_W} height={points[points.length - 1].y + ROW / 2} aria-hidden>
      {points.slice(1).map((b, i) => (
        <path
          key={i}
          d={seg(points[i], b)}
          fill="none"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="0.1 14"
          stroke={i < doneUpTo ? "var(--color-neon-green)" : "rgb(255 255 255 / 0.18)"}
        />
      ))}
    </svg>
  );
}

function Coin({
  state,
  Icon,
  onClick,
  buttonRef,
  label,
}: {
  state: LessonState;
  Icon: LucideIcon;
  onClick: () => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  label: string;
}) {
  const look = {
    done: "bg-[radial-gradient(circle_at_35%_28%,#fff1bf,var(--color-gold)_55%,#e3a51f)] text-[#6b4a00] [--edge:var(--color-gold-deep)] [--glow-shadow:0_0_22px_-4px_var(--color-gold)]",
    current: "bg-[radial-gradient(circle_at_35%_28%,#e2b6ff,var(--color-neon-purple)_55%,#8d2fe0)] text-white [--edge:var(--color-neon-purple-deep)] [--glow-shadow:0_0_26px_-2px_var(--color-neon-purple)]",
    open: "bg-[radial-gradient(circle_at_35%_28%,#3a3a5c,#23233d)] text-neon-purple ring-2 ring-neon-purple/70 [--edge:#151526]",
    locked: "bg-[radial-gradient(circle_at_35%_28%,#3a3a52,#262638)] text-white/35 [--edge:#15151f]",
  }[state];
  return (
    <div className="relative" style={{ width: COIN, height: COIN }}>
      {state === "current" && (
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-neon-purple"
          animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`relative flex size-full items-center justify-center rounded-full coin-3d ${look}`}
      >
        <span className="absolute inset-[7px] rounded-full border-2 border-white/30" />
        <Icon className="relative size-9" strokeWidth={2.4} />
        {state === "done" && (
          <span className="absolute -left-1 -top-1 flex size-6 items-center justify-center rounded-full bg-neon-green text-bg ring-2 ring-bg">
            <Check className="size-3.5" strokeWidth={4} />
          </span>
        )}
        {state === "locked" && (
          <span className="absolute -left-1 -top-1 flex size-6 items-center justify-center rounded-full bg-surface-2 text-muted ring-2 ring-bg">
            <Lock className="size-3" strokeWidth={3} />
          </span>
        )}
      </button>
    </div>
  );
}

// The unit's treasure chest: it opens once every lesson in the unit is done.
function Chest({ point, open }: { point: Point; open: boolean }) {
  return (
    <motion.div
      className="absolute flex flex-col items-center gap-1"
      style={{ left: point.x - 36, top: point.y - 36 }}
      animate={open ? { rotate: [0, -6, 6, 0] } : {}}
      transition={{ duration: 0.8, repeat: open ? Infinity : 0, repeatDelay: 2.5 }}
      aria-label={open ? "תיבת האוצר נפתחה" : "תיבת אוצר: נפתחת בסיום היחידה"}
    >
      <span
        className={`flex size-[72px] items-center justify-center rounded-[22px] ${
          open
            ? "bg-[linear-gradient(160deg,#ffe08a,var(--color-gold)_60%,#d4951a)] text-[#6b4a00] shadow-[0_6px_0_var(--color-gold-deep),0_0_24px_-4px_var(--color-gold)]"
            : "bg-[linear-gradient(160deg,#3a3a52,#262638)] text-white/35 shadow-[0_6px_0_#15151f]"
        }`}
      >
        <Gift className="size-9" strokeWidth={2.2} />
      </span>
    </motion.div>
  );
}

function Stars({ count, dim }: { count: number; dim: boolean }) {
  if (dim && count === 0) return null;
  return (
    <span className="absolute -bottom-7 left-1/2 flex -translate-x-1/2 gap-0.5" aria-label={`${count} כוכבים`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} className={`size-4 ${i <= count ? "text-gold" : "text-white/15"}`} fill="currentColor" />
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
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-label={lesson.titleHe}
        className="glass-strong fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md flex-col gap-4 rounded-t-[var(--radius-card)] p-5 pb-8"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20" />
        <div className="flex items-center gap-3">
          <Avatar persona={persona.id} state="idle" size={64} />
          <div className="flex flex-col">
            <h2 className="text-heading font-semibold">{lesson.titleHe}</h2>
            <span className="text-small text-muted">
              עם {persona.name} · {lesson.sceneHe}
            </span>
          </div>
        </div>
        <p>
          <b className="text-neon-green">המשימה: </b>
          {lesson.goalHe}
        </p>
        <div className="flex flex-col gap-2">
          <span className="text-small text-muted">
            מילים להשתמש בהן ({lesson.need} מתוך {lesson.words.length} כדי לעבור). לחיצה על מילה משמיעה איך הוגים אותה:
          </span>
          <ul className="flex flex-wrap gap-2">
            {lesson.words.map((w) => (
              <WordChip key={w.es} word={w} />
            ))}
          </ul>
        </div>
        {state === "locked" ? (
          <Button tone="ghost" disabled>
            <Lock className="size-4" />
            קודם מסיימים את השיעור הקודם
          </Button>
        ) : disabled ? (
          <Button tone="ghost" disabled>נגמרו הדקות להיום</Button>
        ) : (
          <ButtonLink tone={state === "done" ? "purple" : "green"} glow href={`/app/call?lesson=${lesson.id}`}>
            {state === "done" ? (stars < 3 ? "לשפר כוכבים" : "לתרגל שוב") : "בואו נדבר"}
          </ButtonLink>
        )}
      </motion.div>
    </>
  );
}
