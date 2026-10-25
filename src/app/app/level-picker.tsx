"use client";

import { useState } from "react";
import { LEVELS, type LevelId } from "@/lib/levels";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LevelPicker({ initial }: { initial: LevelId }) {
  const [selected, setSelected] = useState<LevelId>(initial);

  async function choose(id: LevelId) {
    setSelected(id);
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ spanish_level: id }).eq("id", data.user.id);
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display font-semibold">הרמה בספרדית</h2>
      <div role="radiogroup" className="grid grid-cols-3 gap-2">
        {LEVELS.map((l) => {
          const active = l.id === selected;
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(l.id)}
              className={`btn-3d glass rounded-[var(--radius-btn)] px-2 py-3 font-display font-medium ${
                active ? "glow-green !border-transparent !bg-neon-green/10 text-neon-green" : ""
              }`}
            >
              {l.labelHe}
            </button>
          );
        })}
      </div>
      <p className="text-small text-muted">{LEVELS.find((l) => l.id === selected)?.hintHe}</p>
    </section>
  );
}
