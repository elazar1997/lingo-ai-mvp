"use client";

import { Captions, CaptionsOff, Check, ChevronRight, Mic, MicOff, PhoneOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Avatar } from "@/components/avatar";
import { Button, ButtonLink } from "@/components/ui";
import type { Lesson } from "@/content/path-es";
import { errorHe } from "@/lib/messages";
import { wordsSaid } from "@/lib/mission";
import type { Persona } from "@/lib/personas";
import { avatarMood, initialCallState, reduceEvent } from "@/lib/realtime-events";
import { vibrate } from "@/lib/sfx";

type Phase = "ready" | "connecting" | "live" | "ending" | "ended" | "error";

// Seconds before the end at which the persona is asked to wrap up.
const WRAP_UP_AT = 45;

export function CallScreen({
  persona,
  lesson,
  placement = false,
}: {
  persona: Persona;
  lesson?: Lesson;
  placement?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("ready");
  const [error, setError] = useState<string | null>(null);
  const [state, dispatch] = useReducer(reduceEvent, initialCallState);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const router = useRouter();

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

  // Ends the call; by default then opens the tutor's summary for it.
  const hangUp = useCallback(async (toSummary = true) => {
    if (!session.current) return;
    setPhase("ending");
    const body = endPayload();
    const id = session.current.id;
    session.current = null;
    teardown();
    if (body) {
      await fetch("/api/realtime/end", { method: "POST", headers: { "Content-Type": "application/json" }, body }).catch(
        () => undefined,
      );
    }
    setPhase("ended");
    if (toSummary && body) router.push(`/app/summary/${id}`);
  }, [endPayload, teardown, router]);

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
        body: JSON.stringify({ personaId: persona.id, lessonId: lesson?.id, placement, sdp: offer.sdp }),
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
      if (session.current) await hangUp(false);
      else teardown();
      setPhase("error");
    }
  }

  function toggleMute() {
    const next = !muted;
    mic.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  }

  const said = useMemo(
    () => (lesson ? wordsSaid(lesson, state.turns.filter((t) => t.role === "user").map((t) => t.text)) : []),
    [lesson, state.turns],
  );
  const missionReady = !!lesson && said.length >= lesson.need;

  // A short buzz for each target word said (no sounds during a call: they would reach the mic).
  const saidCount = useRef(0);
  useEffect(() => {
    if (said.length > saidCount.current) vibrate(missionReady ? [30, 50, 30] : 25);
    saidCount.current = said.length;
  }, [said.length, missionReady]);

  const mood = phase === "connecting" ? "thinking" : avatarMood(state);
  const mm = String(Math.floor(secondsLeft / 60));
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="flex items-center justify-between">
        <Link href="/app" className="flex items-center gap-1 text-small text-muted" onClick={() => void hangUp(false)}>
          <ChevronRight className="size-4" />
          חזרה
        </Link>
        {phase === "live" && (
          <span className="glass rounded-full px-3 py-1 font-display font-semibold tabular-nums" dir="ltr">
            {mm}:{ss}
          </span>
        )}
      </header>

      {lesson && (
        <section className="glass flex flex-col gap-2 rounded-[var(--radius-card)] p-3">
          <div className="flex items-center justify-between">
            <b className="font-display font-semibold">{lesson.titleHe}</b>
            <span className="text-small text-muted tabular-nums">
              {said.length}/{lesson.need} מילים
            </span>
          </div>
          <p className="text-small text-muted">{lesson.goalHe}</p>
          <ul className="flex flex-wrap gap-1.5" dir="ltr">
            {lesson.words.map((w, i) => {
              const hit = said.includes(i);
              return (
                <motion.li
                  key={w.es}
                  animate={hit ? { scale: [1, 1.18, 1] } : {}}
                  transition={{ duration: 0.35 }}
                  title={w.he}
                  className={`flex items-center gap-1 rounded-full px-3 py-1 font-display font-semibold ${
                    hit ? "glow-green bg-neon-green text-bg" : "bg-white/8 text-ink"
                  }`}
                >
                  {hit && <Check className="size-3.5" strokeWidth={3.5} />}
                  {w.es}
                </motion.li>
              );
            })}
          </ul>
        </section>
      )}
      {placement && (
        <p className="glass rounded-[var(--radius-card)] p-3 text-center text-small text-muted">
          מבחן רמה: מדברים עם לוסיה כשתי דקות, והיא מתאימה את השאלות לתשובות. אין תשובות לא נכונות.
        </p>
      )}

      <section className="flex flex-col items-center gap-2 pt-2">
        <Avatar persona={persona.id} state={mood} size={lesson || placement ? 140 : 180} />
        <h1 className="text-title font-bold">{persona.name}</h1>
        <p className="text-small text-muted">
          {phase === "ready" && persona.taglineHe}
          {phase === "connecting" && "מתחברים..."}
          {phase === "live" && (state.assistantSpeaking ? "מדברת" : state.userSpeaking ? "מקשיבה לך" : "תורך לדבר")}
          {phase === "ending" && "מסיימים..."}
          {phase === "ended" && "השיחה הסתיימה. מכינים לך סיכום..."}
        </p>
      </section>

      {captions && state.turns.length > 0 && (
        <section className="glass flex max-h-[38dvh] flex-col gap-2 overflow-y-auto rounded-[var(--radius-card)] p-3" dir="ltr">
          {state.turns.map((t) => (
            <p key={t.id} className={t.role === "user" ? "self-end rounded-[var(--radius-btn)] bg-neon-purple/20 px-3 py-2" : "px-1"}>
              {t.text}
            </p>
          ))}
          {state.partial && <p className="px-1 text-muted">{state.partial}</p>}
          <div ref={transcriptEnd} />
        </section>
      )}

      {error && <p className="text-center text-small text-danger">{error}</p>}

      <audio ref={audio} autoPlay playsInline />

      <div className="mt-auto flex flex-col gap-3">
        {(phase === "ready" || phase === "error") && (
          <Button tone={persona.accent} glow onClick={start}>
            {phase === "error"
              ? "לנסות שוב"
              : lesson
                ? "להתחיל את השיעור"
                : placement
                  ? "להתחיל את מבחן הרמה"
                  : `להתחיל שיחה עם ${persona.name}`}
          </Button>
        )}
        {phase === "live" && (
          <>
            <div className="flex gap-3">
              <Button tone="ghost" onClick={toggleMute} className="flex-1">
                {muted ? <MicOff className="size-5 text-gold" /> : <Mic className="size-5" />}
                {muted ? "להפעיל מיקרופון" : "השתקה"}
              </Button>
              <Button tone="ghost" onClick={() => setCaptions((c) => !c)} className="flex-1">
                {captions ? <CaptionsOff className="size-5" /> : <Captions className="size-5" />}
                {captions ? "בלי כתוביות" : "כתוביות"}
              </Button>
            </div>
            {missionReady ? (
              <motion.button
                onClick={() => void hangUp()}
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="btn-3d glow-green flex h-13 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-neon-green font-display text-[17px] font-semibold text-bg [--edge:var(--color-neon-green-deep)]"
              >
                <Check className="size-5" strokeWidth={3} />
                סיום שיעור
              </motion.button>
            ) : (
              <button
                onClick={() => void hangUp()}
                className="btn-3d flex h-13 items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-danger font-display text-[17px] font-semibold text-bg [--edge:#b8324f]"
              >
                <PhoneOff className="size-5" />
                {lesson ? "לסיים עכשיו" : "לסיים שיחה"}
              </button>
            )}
          </>
        )}
        {phase === "ended" && (
          <ButtonLink tone="ghost" href="/app">
            חזרה למסך הבית
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
