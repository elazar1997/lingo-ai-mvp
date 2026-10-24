"use client";

import { motion } from "framer-motion";
import type { PersonaId } from "@/lib/personas";

export type AvatarState = "idle" | "speaking" | "laughing" | "thinking";

const COLORS: Record<PersonaId, { ring: string; hair: string }> = {
  lucia: { ring: "var(--color-neon-purple)", hair: "#4a2b1a" },
  vale: { ring: "var(--color-neon-green)", hair: "#1a1a2e" },
};

// Placeholder face until the real illustrations arrive. Swap the <svg> for
// <Image src={`/avatars/${persona}-${state}.png`} /> and keep the motion wrapper.
export function Avatar({ persona, state, size = 160 }: { persona: PersonaId; state: AvatarState; size?: number }) {
  const c = COLORS[persona];
  const motionByState = {
    idle: { scale: [1, 1.03, 1], transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const } },
    speaking: { y: [0, -4, 0], transition: { duration: 0.45, repeat: Infinity } },
    laughing: { rotate: [0, -3, 3, 0], y: [0, -6, 0], transition: { duration: 0.6, repeat: Infinity } },
    thinking: { rotate: [0, -4, 0], transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const } },
  }[state];

  return (
    <motion.div animate={motionByState} style={{ width: size, height: size }} aria-label={`${persona} ${state}`}>
      <svg viewBox="0 0 100 100" width={size} height={size} role="img">
        <circle cx="50" cy="50" r="47" fill="var(--color-surface-2)" stroke={c.ring} strokeWidth="3" />
        <path d={persona === "lucia" ? "M22 52c0-24 56-24 56 0v-8c0-26-56-26-56 0z" : "M20 48c4-28 56-28 60 0-10-10-22-14-30-6-8-8-22-4-30 6z"} fill={c.hair} />
        <circle cx="50" cy="55" r="22" fill="#e8b98f" />
        {state === "laughing" ? (
          <>
            <path d="M40 52q3-4 6 0M54 52q3-4 6 0" stroke="#2a1a10" strokeWidth="2" fill="none" />
            <path d="M41 62q9 10 18 0z" fill="#2a1a10" />
          </>
        ) : (
          <>
            <circle cx="43" cy={state === "thinking" ? 51 : 53} r="2.4" fill="#2a1a10" />
            <circle cx="57" cy={state === "thinking" ? 51 : 53} r="2.4" fill="#2a1a10" />
            {state === "speaking" ? (
              <ellipse cx="50" cy="65" rx="5" ry="4" fill="#2a1a10" />
            ) : state === "thinking" ? (
              <path d="M45 66h9" stroke="#2a1a10" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M44 63q6 5 12 0" stroke="#2a1a10" strokeWidth="2" fill="none" strokeLinecap="round" />
            )}
          </>
        )}
      </svg>
    </motion.div>
  );
}
