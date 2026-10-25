"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSyncExternalStore } from "react";
import { isMuted, playSfx, setMuted } from "@/lib/sfx";

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function SoundToggle() {
  const muted = useSyncExternalStore(subscribe, isMuted, () => false);

  function toggle() {
    setMuted(!muted);
    listeners.forEach((fn) => fn());
    if (muted) playSfx("tap");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!muted}
      onClick={toggle}
      className="glass flex items-center justify-between rounded-[var(--radius-card)] p-4 text-right"
    >
      <span className="flex items-center gap-3">
        {muted ? <VolumeX className="size-5 text-muted" /> : <Volume2 className="size-5 text-neon-green" />}
        <span className="flex flex-col">
          <span className="font-display font-semibold">צלילים</span>
          <span className="text-small text-muted">צלילים קצרים בתרגולים. בשיחה יש רק רטט.</span>
        </span>
      </span>
      <span className={`relative h-7 w-12 rounded-full transition ${muted ? "bg-line" : "bg-neon-green"}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white transition-all ${muted ? "right-1" : "right-6"}`} />
      </span>
    </button>
  );
}
