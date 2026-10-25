"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button, ButtonLink } from "@/components/ui";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function PersonaPicker({ initial, disabled }: { initial: PersonaId; disabled: boolean }) {
  const [selected, setSelected] = useState<PersonaId>(initial);

  async function choose(id: PersonaId) {
    setSelected(id);
    const supabase = supabaseBrowser();
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.from("profiles").update({ preferred_persona: id }).eq("id", data.user.id);
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading font-semibold">עם מי מדברים היום?</h2>
      <div className="grid grid-cols-2 gap-3">
        {Object.values(PERSONAS).map((p) => {
          const active = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => choose(p.id)}
              aria-pressed={active}
              className={`btn-3d glass flex flex-col items-center gap-2 rounded-[var(--radius-card)] p-4 text-center ${
                active ? (p.accent === "purple" ? "glow-purple !border-transparent" : "glow-green !border-transparent") : ""
              }`}
            >
              <Avatar persona={p.id} state={active ? "speaking" : "idle"} size={88} />
              <span className="font-display text-heading font-semibold">{p.name}</span>
              <span className="text-small text-muted">{p.taglineHe}</span>
            </button>
          );
        })}
      </div>
      <p className="text-small text-muted">{PERSONAS[selected].descriptionHe}</p>
      {disabled ? (
        <Button tone={PERSONAS[selected].accent} disabled>
          נגמרו הדקות להיום
        </Button>
      ) : (
        <ButtonLink tone={PERSONAS[selected].accent} glow href={`/app/call?persona=${selected}`}>
          לדבר עם {PERSONAS[selected].name}
        </ButtonLink>
      )}
    </section>
  );
}
