"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { TargetWord } from "@/content/path-es";
import { speakSpanish, warmUpVoices } from "@/lib/speak";

const spring = { type: "spring", stiffness: 500, damping: 18 } as const;

/**
 * A lesson's target word. Before a call, tapping it plays the Spanish pronunciation.
 * During a call it lights up green with a small burst when the learner says it.
 */
export function WordChip({
  word,
  hit = false,
  speakable = true,
  showHe = true,
}: {
  word: TargetWord;
  hit?: boolean;
  speakable?: boolean;
  showHe?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  useEffect(warmUpVoices, []);

  function play() {
    if (!speakable) return;
    speakSpanish(word.es);
    setPlaying(true);
    setTimeout(() => setPlaying(false), 900);
  }

  return (
    <motion.li
      layout
      animate={hit ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={spring}
      className="relative list-none"
    >
      <button
        type="button"
        onClick={play}
        disabled={!speakable}
        aria-label={speakable ? `השמעה: ${word.es}` : word.es}
        className={`flex items-center gap-2 rounded-[var(--radius-btn)] px-3 py-1.5 text-right transition-colors duration-300 disabled:cursor-default ${
          hit ? "glow-green bg-neon-green text-bg" : "bg-white/8 text-ink active:bg-white/15"
        }`}
      >
        {hit ? (
          <Check className="size-4 shrink-0" strokeWidth={3.5} />
        ) : (
          speakable && (
            <Volume2 className={`size-4 shrink-0 ${playing ? "animate-pulse text-neon-green" : "text-muted"}`} />
          )
        )}
        <span className="flex flex-col">
          <b dir="ltr" className="text-left font-display font-semibold">
            {word.es}
          </b>
          {showHe && <span className={`text-small ${hit ? "text-bg/70" : "text-muted"}`}>{word.he}</span>}
        </span>
      </button>

      <AnimatePresence>
        {hit && (
          <>
            <motion.span
              key="plus"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -28 }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 font-display font-bold text-neon-green"
            >
              +1
            </motion.span>
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <motion.span
                  key={`spark-${i}`}
                  initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                  animate={{ opacity: 0, x: Math.cos(a) * 34, y: Math.sin(a) * 22, scale: 0.4 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 rounded-full bg-neon-green"
                />
              );
            })}
          </>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
