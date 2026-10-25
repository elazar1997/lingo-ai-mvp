"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lightbulb } from "lucide-react";
import { useState } from "react";
import { BAND_TITLE_HE, type QuizQuestion } from "@/content/placement-es";
import { Button } from "@/components/ui";
import { LEVELS, type LevelId } from "@/lib/levels";
import { MAX_QUESTIONS, answerQuiz, nextQuestion, quizLevel, shuffledOptions, startQuiz } from "@/lib/placement";
import { playSfx, vibrate } from "@/lib/sfx";

const spring = { type: "spring", stiffness: 420, damping: 30 } as const;

// Duolingo-style level check: pick the right picture, word or meaning. Wrong answers get a
// soft card with the right one, never an alarm.
export function PlacementQuiz({ onDone, onSkip }: { onDone: (level: LevelId) => void; onSkip: () => void }) {
  const [state, setState] = useState(startQuiz);
  const [question, setQuestion] = useState<QuizQuestion | null>(() => nextQuestion(startQuiz()));
  const [picked, setPicked] = useState<number | null>(null);

  if (state.done || !question) return <QuizResult level={quizLevel(state)} onDone={onDone} />;

  const { options, answer } = shuffledOptions(question);
  const checked = picked !== null;
  const correct = picked === answer;
  const emojiOptions = question.kind === "word-emoji";

  function pick(i: number) {
    if (checked) return;
    setPicked(i);
    const right = i === answer;
    playSfx(right ? "correct" : "wrong");
    vibrate(right ? 20 : [30, 60, 30]);
  }

  function next() {
    if (!question) return;
    const s = answerQuiz(state, question.id, correct);
    setState(s);
    setQuestion(nextQuestion(s));
    setPicked(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-neon-green"
            animate={{ width: `${(state.asked.length / MAX_QUESTIONS) * 100}%` }}
            transition={spring}
          />
        </div>
        <button type="button" onClick={onSkip} className="text-small text-muted underline-offset-4 hover:underline">
          מתחילים מאפס
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-5"
        >
          <h1 className="text-heading font-semibold">{BAND_TITLE_HE[question.band]}</h1>

          <Prompt question={question} />

          <div className={`grid gap-3 ${emojiOptions || question.kind === "emoji-word" || question.kind === "blank" ? "grid-cols-2" : "grid-cols-1"}`}>
            {options.map((opt, i) => {
              const look = !checked ? "idle" : i === answer ? "right" : i === picked ? "wrong" : "dim";
              return (
                <motion.button
                  key={opt}
                  type="button"
                  whileTap={checked ? undefined : { scale: 0.96 }}
                  transition={spring}
                  onClick={() => pick(i)}
                  dir={question.kind === "meaning" || question.kind === "dialogue" ? "rtl" : "ltr"}
                  className={`btn-3d glass flex items-center justify-center rounded-[var(--radius-card)] p-4 text-center transition-colors ${
                    emojiOptions ? "min-h-24 text-5xl" : "min-h-16 font-display text-[17px] font-medium"
                  } ${
                    look === "right"
                      ? "!border-neon-green !bg-neon-green/15 text-neon-green"
                      : look === "wrong"
                        ? "!border-gold/60 opacity-80"
                        : look === "dim"
                          ? "opacity-40"
                          : ""
                  }`}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {checked && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={spring}
            className={`glass-strong mt-auto flex flex-col gap-3 rounded-[var(--radius-card)] p-4 ${
              correct ? "!border-neon-green/50" : "!border-gold/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex size-10 items-center justify-center rounded-full ${correct ? "bg-neon-green text-bg" : "bg-gold/20 text-gold"}`}
              >
                {correct ? <Check className="size-6" strokeWidth={3} /> : <Lightbulb className="size-5" />}
              </span>
              <div className="flex flex-col">
                <span className="font-display text-heading font-semibold">{correct ? "מעולה!" : "כמעט!"}</span>
                {!correct && (
                  <span className="text-small text-muted">
                    התשובה הנכונה: <span className="text-ink">{question.options[0]}</span>
                  </span>
                )}
              </div>
            </div>
            <Button tone={correct ? "green" : "gold"} onClick={next}>
              המשך
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Prompt({ question }: { question: QuizQuestion }) {
  if (question.kind === "emoji-word") {
    return <div className="glass mx-auto flex size-32 items-center justify-center rounded-[var(--radius-card)] text-7xl">{question.prompt}</div>;
  }
  if (question.kind === "dialogue") {
    return (
      <div className="flex flex-col gap-3">
        <div className="glass flex flex-col gap-2 rounded-[var(--radius-card)] p-4 text-body" dir="ltr">
          {question.dialogue?.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="font-display font-semibold">{question.prompt}</p>
      </div>
    );
  }
  return (
    <div className="glass flex flex-col gap-1 rounded-[var(--radius-card)] p-5 text-center">
      <p className={`font-display font-semibold ${question.kind === "word-emoji" ? "text-title" : "text-heading"}`} dir="ltr">
        {question.prompt}
      </p>
      {question.hintHe && <p className="text-small text-muted">{question.hintHe}</p>}
    </div>
  );
}

function QuizResult({ level, onDone }: { level: LevelId; onDone: (level: LevelId) => void }) {
  const info = LEVELS.find((l) => l.id === level)!;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={spring}
      className="flex flex-1 flex-col items-center gap-5 pt-8 text-center"
    >
      <span className="glow-green flex size-20 items-center justify-center rounded-full bg-neon-green/15 text-neon-green">
        <Check className="size-10" strokeWidth={3} />
      </span>
      <h1 className="text-title font-bold">הרמה שלך: {info.labelHe}</h1>
      <p className="text-muted">{info.hintHe}. אפשר לשנות את הרמה בכל רגע בהגדרות.</p>
      <div className="mt-auto w-full">
        <Button tone="green" glow onClick={() => onDone(level)}>
          למסלול שלי
        </Button>
      </div>
    </motion.div>
  );
}

