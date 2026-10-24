import Link from "next/link";
import type { ComponentProps } from "react";

type Tone = "purple" | "green";

const tones: Record<Tone, string> = {
  purple: "bg-neon-purple text-bg glow-purple",
  green: "bg-neon-green text-bg glow-green",
};

const base =
  "inline-flex h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-bold transition active:scale-[0.98] disabled:opacity-50";

export function Button({ tone = "purple", className = "", ...props }: ComponentProps<"button"> & { tone?: Tone }) {
  return <button className={`${base} ${tones[tone]} ${className}`} {...props} />;
}

export function ButtonLink({ tone = "purple", className = "", ...props }: ComponentProps<typeof Link> & { tone?: Tone }) {
  return <Link className={`${base} ${tones[tone]} ${className}`} {...props} />;
}

export function Field({ label, ...props }: ComponentProps<"input"> & { label: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm text-muted">
      {label}
      <input
        className="h-12 rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none focus:border-neon-purple"
        {...props}
      />
    </label>
  );
}

export function Logo() {
  return (
    <span className="text-2xl font-extrabold tracking-tight" dir="ltr">
      Lingo <span className="text-neon-green">AI</span>
    </span>
  );
}
