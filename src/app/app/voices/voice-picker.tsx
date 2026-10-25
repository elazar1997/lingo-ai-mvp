"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { errorHe } from "@/lib/messages";
import { PERSONAS, type PersonaId } from "@/lib/personas";
import { VOICE_CANDIDATES } from "@/lib/voice-samples";

// Internal page for choosing each persona's voice. Each play costs a fraction of a cent,
// so a sample is fetched once and replayed from memory.
export function VoicePicker() {
  const cache = useRef(new Map<string, string>());
  const player = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function play(personaId: PersonaId, voice: string) {
    const key = `${personaId}:${voice}`;
    setError(null);
    let url = cache.current.get(key);
    if (!url) {
      setLoading(key);
      const res = await fetch("/api/voices/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId, voice }),
      });
      setLoading(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(errorHe(data.error));
        return;
      }
      url = URL.createObjectURL(await res.blob());
      cache.current.set(key, url);
    }
    if (player.current) {
      player.current.src = url;
      void player.current.play();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">השוואת קולות</h1>
        <Link href="/app" className="text-sm text-muted">
          → חזרה
        </Link>
      </header>
      <p className="text-sm text-muted">לוחצים על קול כדי לשמוע את אותו משפט בקולות שונים. הראשון ברשימה הוא הקול הנוכחי.</p>

      {(Object.keys(VOICE_CANDIDATES) as PersonaId[]).map((personaId) => (
        <section key={personaId} className="flex flex-col gap-3">
          <h2 className="font-bold">{PERSONAS[personaId].name}</h2>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_CANDIDATES[personaId].map((voice, i) => {
              const key = `${personaId}:${voice}`;
              return (
                <button
                  key={voice}
                  type="button"
                  onClick={() => play(personaId, voice)}
                  disabled={loading !== null}
                  className="flex h-14 flex-col items-center justify-center rounded-2xl border border-line bg-surface text-sm disabled:opacity-50"
                >
                  <span dir="ltr">{loading === key ? "..." : `▶ ${voice}`}</span>
                  {i === 0 && <span className="text-xs text-neon-green">נוכחי</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {error && <p className="text-center text-sm text-danger">{error}</p>}
      <audio ref={player} playsInline />
    </div>
  );
}
