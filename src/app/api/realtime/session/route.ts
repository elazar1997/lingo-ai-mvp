import { z } from "zod";
import { apiError, apiOk, dbErrorCode } from "@/lib/api";
import { sha256Hex } from "@/lib/crypto";
import { env } from "@/lib/env";
import { isPersonaId } from "@/lib/personas";
import { buildInstructions, personaVoice } from "@/lib/personas.server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({ personaId: z.string().refine(isPersonaId), sdp: z.string().min(1).max(20_000) });

// Opens a conversation: checks quota and budget in one transaction, then forwards the
// browser's WebRTC offer to OpenAI with the prompt and voice locked in server-side, and
// returns OpenAI's answer. The browser never talks to the OpenAI API or sees a key, and
// cannot change the instructions.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPersonaId(parsed.data.personaId)) return apiError("BAD_REQUEST");
  const personaId = parsed.data.personaId;

  const e = env();
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, spanish_level")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return apiError("PROFILE_MISSING");

  const { data: started, error: startError } = await admin
    .rpc("start_session", {
      p_user: user.id,
      p_persona: personaId,
      p_daily_seconds: e.DAILY_LIMIT_MINUTES * 60,
      p_max_session_seconds: e.MAX_SESSION_MINUTES * 60,
      p_budget_block_usd: e.MONTHLY_BUDGET_USD * e.BUDGET_BLOCK_RATIO,
      p_reserve_usd_per_minute: e.RESERVE_USD_PER_MINUTE,
    })
    .single<{ session_id: string; allowed_seconds: number }>();
  if (startError || !started) return apiError(dbErrorCode(startError?.message));

  const form = new FormData();
  form.set("sdp", parsed.data.sdp);
  form.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: e.REALTIME_MODEL,
      instructions: buildInstructions(personaId, {
        level: profile.spanish_level,
        displayName: profile.display_name,
      }),
      audio: {
        input: {
          transcription: { model: e.TRANSCRIBE_MODEL, language: "es" },
          turn_detection: { type: "server_vad" },
        },
        output: { voice: personaVoice(personaId) },
      },
    }),
  );

  const res = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${e.OPENAI_API_KEY}`,
      // Hashed user id lets OpenAI's abuse systems tell users apart without personal data.
      "OpenAI-Safety-Identifier": sha256Hex(user.id),
    },
    body: form,
  }).catch(() => null);

  if (!res?.ok) {
    // Release the reservation right away so a failed start doesn't eat quota or budget.
    await admin.rpc("end_session", {
      p_user: user.id,
      p_session: started.session_id,
      p_seconds: 0,
      p_reported_usd: 0,
      p_usd_per_minute: e.RESERVE_USD_PER_MINUTE,
    });
    const detail = res ? (await res.text().catch(() => "")).slice(0, 500) : "network error";
    console.error("realtime call failed", res?.status, detail);
    return apiError("UPSTREAM_ERROR");
  }

  return apiOk({
    sessionId: started.session_id,
    allowedSeconds: started.allowed_seconds,
    sdp: await res.text(),
  });
}
