"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Avatar, type AvatarState } from "@/components/avatar";
import type { PersonaId } from "@/lib/personas";

const BARS = 48;
const ORBIT = Array.from({ length: 13 }, (_, k) => (k / 12) * Math.PI * 2);
const PURPLE = "177, 75, 255";
const GREEN = "57, 255, 136";

// The avatar in the middle of a live call, with rings that react to real audio levels:
// purple pulses from the persona's voice, a ring of green bars from the learner's mic,
// a slow breathing ring when it is the learner's turn, and orbiting dots while thinking.
export function VoiceStage({
  persona,
  mood,
  size,
  audioCtx,
  mic,
  remote,
  live,
}: {
  persona: PersonaId;
  mood: AvatarState;
  size: number;
  audioCtx: AudioContext | null;
  mic: MediaStream | null;
  remote: MediaStream | null;
  live: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const stage = size + 150;

  useEffect(() => {
    const el = canvas.current;
    const g = el?.getContext("2d");
    if (!el || !g) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    el.width = stage * dpr;
    el.height = stage * dpr;
    g.scale(dpr, dpr);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const analyser = (stream: MediaStream | null) => {
      if (!audioCtx || !stream || !stream.getAudioTracks().length) return null;
      try {
        const node = audioCtx.createAnalyser();
        node.fftSize = 256;
        node.smoothingTimeConstant = 0.75;
        audioCtx.createMediaStreamSource(stream).connect(node);
        return node;
      } catch {
        return null;
      }
    };
    const micNode = analyser(mic);
    const aiNode = analyser(remote);
    const freq = new Uint8Array(128);
    const wave = new Uint8Array(256);
    const bars = new Float32Array(BARS);
    let ai = 0;
    let frame = 0;

    const center = stage / 2;
    const base = size / 2 + 6;

    function rms(node: AnalyserNode | null) {
      if (!node) return 0;
      node.getByteTimeDomainData(wave);
      let sum = 0;
      for (const v of wave) sum += ((v - 128) / 128) ** 2;
      return Math.min(1, Math.sqrt(sum / wave.length) * 4);
    }

    function draw(t: number) {
      g!.clearRect(0, 0, stage, stage);
      ai += (rms(aiNode) - ai) * 0.25;

      // Soft glow behind the avatar, brighter while the persona speaks.
      const glow = g!.createRadialGradient(center, center, base * 0.6, center, center, center);
      glow.addColorStop(0, `rgba(${PURPLE}, ${0.12 + ai * 0.35})`);
      glow.addColorStop(1, `rgba(${PURPLE}, 0)`);
      g!.fillStyle = glow;
      g!.fillRect(0, 0, stage, stage);

      // Persona voice: three rings pushed outwards by the level.
      for (let i = 1; i <= 3; i++) {
        const r = base + 8 + i * (6 + ai * (reduced ? 4 : 12));
        g!.beginPath();
        g!.arc(center, center, r, 0, Math.PI * 2);
        g!.strokeStyle = `rgba(${PURPLE}, ${(0.5 - i * 0.12) * Math.min(1, ai * 2.5)})`;
        g!.lineWidth = 3;
        g!.stroke();
      }

      // Learner mic: a ring of bars driven by the speech frequencies.
      let loud = 0;
      if (micNode) {
        micNode.getByteFrequencyData(freq);
        const level = rms(micNode);
        for (let i = 0; i < BARS; i++) {
          // Mirror the bins so the ring is symmetric; bins 2-50 cover speech. Half of each
          // bar is the overall loudness, so the whole ring moves, not just one side.
          const k = i < BARS / 2 ? i : BARS - 1 - i;
          const v = 0.5 * (freq[2 + k * 2] / 255) + 0.5 * level;
          bars[i] += (v - bars[i]) * 0.4;
          loud = Math.max(loud, bars[i]);
        }
      }
      if (loud > 0.08) {
        for (let i = 0; i < BARS; i++) {
          const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
          const len = 3 + bars[i] * (reduced ? 10 : 30);
          const r0 = base + 4;
          g!.beginPath();
          g!.moveTo(center + Math.cos(a) * r0, center + Math.sin(a) * r0);
          g!.lineTo(center + Math.cos(a) * (r0 + len), center + Math.sin(a) * (r0 + len));
          g!.strokeStyle = `rgba(${GREEN}, ${0.35 + bars[i] * 0.65})`;
          g!.lineWidth = 3;
          g!.lineCap = "round";
          g!.stroke();
        }
      } else if (live && ai < 0.05) {
        // Quiet on both sides: a slow breathing ring invites the learner to speak.
        const b = reduced ? 0.5 : (Math.sin(t / 700) + 1) / 2;
        g!.beginPath();
        g!.arc(center, center, base + 8 + b * 6, 0, Math.PI * 2);
        g!.strokeStyle = `rgba(${GREEN}, ${0.18 + b * 0.25})`;
        g!.lineWidth = 2;
        g!.stroke();
      }

      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [audioCtx, mic, remote, live, size, stage]);

  return (
    <div className="relative flex items-center justify-center" style={{ width: stage, height: stage }}>
      <canvas ref={canvas} className="absolute inset-0" style={{ width: stage, height: stage }} aria-hidden />
      {mood === "thinking" &&
        [0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute size-2.5 rounded-full bg-neon-purple"
            style={{ top: stage / 2 - 5, left: stage / 2 - 5 }}
            animate={{
              x: ORBIT.map((a) => Math.cos(a + (i * Math.PI * 2) / 3) * (size / 2 + 22)),
              y: ORBIT.map((a) => Math.sin(a + (i * Math.PI * 2) / 3) * (size / 2 + 22)),
            }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
          />
        ))}
      <Avatar persona={persona} state={mood} size={size} />
    </div>
  );
}
