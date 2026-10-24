"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui";
import { errorHe } from "@/lib/messages";
import type { Persona } from "@/lib/personas";
import { avatarMood, initialCallState, reduceEvent } from "@/lib/realtime-events";

type Phase = "ready" | "connecting" | "live" | "ending" | "ended" | "error";

// Seconds before the end at which the persona is asked to wrap up.
const WRAP_UP_AT = 45;

export function CallScreen({ persona }: { persona: Persona }) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduceEvent, initialCallState);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);

  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const mic = useRef<MediaStream | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const stateRef = useRef(state);
  const wrapUpSent = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    stateRef.current = state;
    transcriptEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [state]);

  const send = (event: object) => {
    if (dc.current?.readyState === "open") dc.current.send(JSON.stringify(event));
  };

  const endPayload = useCallback(() => {
    const s = session.current;
    if (!s) return null;
    return JSON.stringify({
      sessionId: s.id,
      seconds: Math.round((Date.now() - s.startedAt) / 1000),
      usage: stateRef.current.usage,
      transcript: stateRef.current.turns.map(({ role, text }) => ({ role, text: text.slice(0, 4000) })),
    });
  }, []);

  const teardown = useCallback(() => {
    dc.current?.close();
    pc.current?.getSenders().forEach((s) => s.track?.stop());
    pc.current?.close();
    mic.current?.getTracks().forEach((t) => t.stop());
    pc.current = null;
    dc.current = null;
    mic.current = null;
  }, []);

  const hangUp = useCallback(async () => {
    if (!session.current) return;
    setPhase("ending");
    const body = endPayload();
    session.current = null;
    teardown();
    if (body) {
      await fetch("/api/realtime/end", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(
        () => undefined,
      );
    }
    setPhase("ended");
  }, [endPayload, teardown]);

  // Closing the tab still ends the session, so its minutes and cost are booked.
  useEffect(() => {
    const onHide = () => {
      const body = endPayload();
      if (!body) return;
      session.current = null;
      navigator.sendBeacon("/api/realtime/end", new Blob([body], { type: "application/json" }));
      teardown();
    };
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [endPayload, teardown]);

  // Countdown, a wrap-up nudge near the end, and an automatic hang-up at zero.
  useEffect(() => {
    if (phase !== "live") return;
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    if (secondsLeft === WRAP_UP_AT && !wrapUpSent.current) {
      wrapUpSent.current = true;
      send({
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "system",
          content: [{ type: "input_text", text: "Less than a minute left. Wrap up warmly and say goodbye in one or two short sentences." }],
        },
      });
    }
    if (secondsLeft <= 0) void hangUp();
  }, [phase, secondsLeft, hangUp]);

  async function start() {
    setPhase("connecting");
    setError(null);
    wrapUpSent.current = false;
    try {
      // Ask for the microphone first so a refusal doesn't open a billed session.
      mic.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      setError("צריך לאשר גישה למיקרופון כדי לדבר. אפשר לשנות את זה בהגדרות הדפדפן.");
      setPhase("error");
      return;
    }

    try {
      const peer = new RTCPeerConnection();
      pc.current = peer;
      peer.ontrack = (e) => {
        if (audio.current) audio.current.srcObject = e.streams[0];
      };
      mic.current.getTracks().forEach((t) => peer.addTrack(t, mic.current!));

      const channel = peer.createDataChannel("oai-events");
      dc.current = channel;
      channel.onmessage = (e) => {
        try {
          dispatch(JSON.parse(e.data));
        } catch {
          // Ignore malformed events.
        }
      };
      // The persona speaks first, as its instructions say.
      channel.onopen = () => send({ type: "response.create" });

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed") {
          setError("החיבור נותק. השיחה נשמרה עד הנקודה הזו.");
          void hangUp();
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      // Our server checks quota and budget and passes the offer on to OpenAI.
      const res = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id, sdp: offer.sdp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        teardown();
        setError(errorHe(data.error));
        setPhase("error");
        return;
      }
      session.current = { id: data.sessionId, startedAt: Date.now() };
      setSecondsLeft(data.allowedSeconds);
      await peer.setRemoteDescription({ type: "answer", sdp: data.sdp });
      setPhase("live");
    } catch {
      setError(errorHe("UPSTREAM_ERROR"));
      if (session.current) await hangUp();
      else teardown();
      setPhase("error");
    }
  }

  function toggleMute() {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const mood = phase === "connecting" ? "thinking" : avatarMood(state);
  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link href="/app" className="text-sm text-muted" onClick={() => void hangUp()}>
          → חזרה
        </Link>
        {phase === "live" && (
          <span className="rounded-full bg-surface px-3 py-1 font-mono text-sm tabular-nums" dir="ltr">
            {mm}:{ss}
          </span>
        )}
      </header>

      <section className="flex flex-col items-center gap-2 pt-2">
        <Avatar persona={persona.id} state={mood} size={180} />
        <h1 className="text-2xl font-bold">{persona.name}</h1>
        <p className="text-sm text-muted">
          {phase === "ready" && persona.taglineHe}
          {phase === "connecting" && "מתחברים..."}
          {phase === "live" && (state.assistantSpeaking ? "מדברת" : state.userSpeaking ? "מקשיבה לך" : "תורך לדבר")}
          {phase === "ending" && "מסיימים..."}
          {phase === "ended" && "השיחה הסתיימה. ¡Hasta luego!"}
        </p>
      </section>

      {captions && state.turns.length > 0 && (
        <section className="flex max-h-[38dvh] flex-col gap-2 overflow-y-auto rounded-2xl bg-surface p-3 text-sm" dir="ltr">
          {state.turns.map((t) => (
            <p key={t.id} className={t.role === "user" ? "self-end rounded-xl bg-surface-2 px-3 py-2" : "px-1"}>
              {t.text}
            </p>
          ))}
          {state.partial && <p className="px-1 text-muted">{state.partial}</p>}
          <div ref={transcriptEnd} />
        </section>
      )}

      {error && <p className="text-center text-sm text-danger">{error}</p>}

      <audio ref={audio} autoPlay playsInline />

      <div className="mt-auto flex flex-col gap-3">
        {(phase === "ready" || phase === "error") && (
          <Button tone={persona.accent} onClick={start}>
            {phase === "error" ? "לנסות שוב" : `להתחיל שיחה עם ${persona.name}`}
          </Button>
        )}
        {phase === "live" && (
          <>
            <div className="flex gap-3">
              <button onClick={toggleMute} className="h-12 flex-1 rounded-2xl border border-line">
                {muted ? "להפעיל מיקרופון" : "השתקה"}
              </button>
              <button onClick={() => setCaptions((c) => !c)} className="h-12 flex-1 rounded-2xl border border-line">
                {captions ? "להסתיר כתוביות" : "להציג כתוביות"}
              </button>
            </div>
            <button onClick={() => void hangUp()} className="h-12 rounded-2xl bg-danger font-bold text-bg">
              לסיים שיחה
            </button>
          </>
        )}
        {phase === "ended" && (
          <Link href="/app" className="flex h-12 items-center justify-center rounded-2xl border border-line">
            חזרה למסך הבית
          </Link>
        )}
      </div>
    </div>
  );
}
