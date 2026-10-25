import Link from "next/link";
import type { ComponentProps } from "react";

type Tone = "purple" | "green" | "gold" | "ghost";

// Each tone is a neon fill with a darker bottom edge (see btn-3d in globals.css).
const tones: Record<Tone, string> = {
  purple: "bg-neon-purple text-white [--edge:var(--color-neon-purple-deep)]",
  green: "bg-neon-green text-bg [--edge:var(--color-neon-green-deep)]",
  gold: "bg-gold text-bg [--edge:var(--color-gold-deep)]",
  ghost: "glass text-ink [--edge:rgb(0_0_0/0.35)]",
};

const glows: Record<Tone, string> = {
  purple: "glow-purple",
  green: "glow-green",
  gold: "glow-gold",
  ghost: "",
};

const base =
  "btn-3d inline-flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] px-6 font-display text-[17px] font-semibold disabled:opacity-45 disabled:saturate-50 disabled:shadow-[0_4px_0_var(--edge)]";

type ButtonStyle = { tone?: Tone; glow?: boolean };

function classes({ tone = "purple", glow = false }: ButtonStyle, className: string) {
  return `${base} ${tones[tone]} ${glow ? glows[tone] : ""} ${className}`;
}

/** Glow is for the one primary action on a screen. */
export function Button({ tone, glow, className = "", ...props }: ComponentProps<"button"> & ButtonStyle) {
  return <button className={classes({ tone, glow }, className)} {...props} />;
}

export function ButtonLink({ tone, glow, className = "", ...props }: ComponentProps<typeof Link> & ButtonStyle) {
  return <Link className={classes({ tone, glow }, className)} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`glass rounded-[var(--radius-card)] p-4 ${className}`} {...props} />;
}

export function Field({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-small text-muted">
      {label}
      <input
        className="glass h-12 rounded-[var(--radius-btn)] px-4 text-body text-ink outline-none focus:border-neon-purple"
        {...props}
      />
    </label>
  );
}

export function Logo() {
  return (
    <span className="font-display text-2xl font-bold tracking-tight" dir="ltr">
      Lingo <span className="text-neon-green">AI</span>
    </span>
  );
}
