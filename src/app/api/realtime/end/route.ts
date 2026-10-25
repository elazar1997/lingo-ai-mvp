import { after } from "next/server";
import { z } from "zod";
import { apiError, apiOk, dbErrorCode } from "@/lib/api";
import { realtimeCostUsd, type RealtimeUsage } from "@/lib/cost";
import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { runTutor } from "@/lib/tutor.server";

const n = z.number().int().min(0).max(10_000_000).optional();

const Body = z.object({
  sessionId: z.string().uuid(),
  seconds: z.number().int().min(0).max(3600),
  usage: z
    .object({
      input_token_details: z
        .object({
          text_tokens: n,
          audio_tokens: n,
          cached_tokens_details: z.object({ text_tokens: n, audio_tokens: n }).optional(),
        })
        .optional(),
      output_token_details: z.object({ text_tokens: n, audio_tokens: n }).optional(),
    })
    .optional(),
  transcript: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(4000) }))
    .max(400)
    .default([]),
});

export const maxDuration = 60;

// Closes a conversation, books its cost and stores the encrypted transcript, then runs
// the tutor in the background once the response is sent. The summary screen polls
// /api/feedback/[sessionId] until the tutor's feedback is there.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("BAD_REQUEST");
  const { sessionId, seconds, usage, transcript } = parsed.data;

  const e = env();
  const admin = supabaseAdmin();
  const reported = usage ? realtimeCostUsd(e.REALTIME_MODEL, usage as RealtimeUsage) : null;

  const { error } = await admin.rpc("end_session", {
    p_user: user.id,
    p_session: sessionId,
    p_seconds: seconds,
    p_reported_usd: reported,
    p_usd_per_minute: e.RESERVE_USD_PER_MINUTE,
  });
  if (error) return apiError(dbErrorCode(error.message));

  if (transcript.length > 0) {
    await admin.from("transcripts").insert({
      session_id: sessionId,
      user_id: user.id,
      ciphertext: encrypt(JSON.stringify(transcript), e.TRANSCRIPT_ENCRYPTION_KEY),
    });
  }

  after(() => runTutor({ userId: user.id, sessionId, turns: transcript }));

  return apiOk({ ok: true });
}
