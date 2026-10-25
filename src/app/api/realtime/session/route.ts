import { z } from "zod";
import { apiError, apiOk, dbErrorCode } from "@/lib/api";
import { sha256Hex } from "@/lib/crypto";
import { env, isAdmin } from "@/lib/env";
import { findLesson, LESSONS } from "@/content/path-es";
import { isUnlocked } from "@/lib/mission";
import { isPersonaId, type PersonaId } from "@/lib/personas";
import { buildInstructions, isBeginner, personaVoice, type CallMode } from "@/lib/personas.server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

const Body = z.object({
  personaId: z.string().optional(),
  lessonId: z.string().max(40).optional(),
  placement: z.boolean().optional(),
  sdp: z.string().min(1).max(20_000),
});

// Lessons are short scenes and the placement chat about two minutes, so they reserve less.
const LESSON_SECONDS = 5 * 60;
const PLACEMENT_SECONDS = 150;

// Opens a conversation: checks quota and budget in one transaction, then forwards the
// browser's WebRTC offer to OpenAI with the prompt and voice locked in server-side, and
// returns OpenAI's answer. The browser never talks to the OpenAI API or sees a key, and
// cannot change the instructions.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("BAD_REQUEST");

  const e = env();
  const admin = supabaseAdmin();

  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, spanish_level, goal, interests")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return apiError("PROFILE_MISSING");

  // The lesson fixes the persona; a lesson must be unlocked for this learner.
  let mode: CallMode;
  let personaId: PersonaId;
  let maxSeconds = e.MAX_SESSION_MINUTES * 60;
  if (parsed.data.lessonId) {
    const lesson = findLesson(parsed.data.lessonId);
    if (!lesson) return apiError("BAD_REQUEST");
    const { data: rows } = await admin.from("lesson_progress").select("lesson_id, stars").eq("user_id", user.id);
    const stars = Object.fromEntries((rows ?? []).map((r) => [r.lesson_id, r.stars]));
    if (!isUnlocked(LESSONS, lesson.id, stars, isBeginner(profile.spanish_level))) return apiError("FORBIDDEN");
    mode = { kind: "lesson", lesson };
    personaId = lesson.persona;
    maxSeconds = Math.min(maxSeconds, LESSON_SECONDS);
  } else if (parsed.data.placement) {
    mode = { kind: "placement" };
    personaId = "lucia";
    maxSeconds = Math.min(maxSeconds, PLACEMENT_SECONDS);
  } else {
    if (!isPersonaId(parsed.data.personaId)) return apiError("BAD_REQUEST");
    mode = { kind: "free" };
    personaId = parsed.data.personaId;
  }

  const { data: started, error: startError } = await admin
    .rpc("start_session", {
      p_user: user.id,
      p_persona: personaId,
      // Admins (ADMIN_EMAILS) skip the daily quota so they can test; the per-call cap and
      // the monthly budget still apply to them.
      p_daily_seconds: isAdmin(user.email) ? 24 * 3600 : e.DAILY_LIMIT_MINUTES * 60,
      p_max_session_seconds: maxSeconds,
      p_budget_block_usd: e.MONTHLY_BUDGET_USD * e.BUDGET_BLOCK_RATIO,
      p_reserve_usd_per_minute: e.RESERVE_USD_PER_MINUTE,
      p_kind: mode.kind,
      p_lesson: mode.kind === "lesson" ? mode.lesson.id : null,
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
      instructions: buildInstructions(
        personaId,
        {
          level: profile.spanish_level,
          displayName: profile.display_name,
          goal: profile.goal,
          interests: profile.interests,
        },
        mode,
      ),
      audio: {
        input: {
          transcription: { model: e.TRANSCRIBE_MODEL, language: "es" },
          // Semantic VAD waits for the end of a thought, not just a pause, and "low"
          // eagerness gives learners time to search for words before the persona replies.
          turn_detection: { type: "semantic_vad", eagerness: "low" },
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
    // 429 means the OpenAI account is out of credit or over its limit: show the same
    // "paused" message as our own budget cap rather than a retryable error.
    return apiError(res?.status === 429 ? "BUDGET_LIMIT" : "UPSTREAM_ERROR");
  }

  return apiOk({
    sessionId: started.session_id,
    allowedSeconds: started.allowed_seconds,
    sdp: await res.text(),
  });
}
