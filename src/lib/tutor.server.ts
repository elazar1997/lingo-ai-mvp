import "server-only";
import { env } from "@/lib/env";
import { isPersonaId, PERSONAS } from "@/lib/personas";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  Feedback,
  FEEDBACK_JSON_SCHEMA,
  learnerSpoke,
  silentFeedback,
  toStored,
  tutorSystemPrompt,
  tutorUserMessage,
  type StoredFeedback,
  type TranscriptTurn,
} from "@/lib/tutor";

// Rough price of the tutor model per 1M tokens, for the spend ledger.
const USD_PER_M_IN = 0.25;
const USD_PER_M_OUT = 2;

// Analyzes a finished call and records its feedback, XP and streak day. Safe to call
// twice: record_feedback ignores a second write for the same session.
export async function runTutor(args: {
  userId: string;
  sessionId: string;
  turns: TranscriptTurn[];
}): Promise<void> {
  const admin = supabaseAdmin();
  const [{ data: session }, { data: profile }] = await Promise.all([
    admin.from("sessions").select("billed_seconds, persona_id").eq("id", args.sessionId).maybeSingle(),
    admin.from("profiles").select("spanish_level").eq("id", args.userId).maybeSingle(),
  ]);
  const billed = session?.billed_seconds ?? 0;

  let stored: StoredFeedback;
  if (!learnerSpoke(args.turns)) {
    stored = silentFeedback(billed);
  } else {
    try {
      stored = toStored(
        await analyze(args.turns, profile?.spanish_level ?? "beginner", isPersonaId(session?.persona_id) ? PERSONAS[session.persona_id].name : "Lucía", args.userId),
        billed,
      );
    } catch (err) {
      console.error("tutor failed", String(err));
      return;
    }
  }

  const { error } = await admin.rpc("record_feedback", {
    p_user: args.userId,
    p_session: args.sessionId,
    p_data: stored,
    p_xp: stored.xp.total,
  });
  if (error) console.error("record_feedback failed", error.message);
}

export async function analyze(
  turns: TranscriptTurn[],
  level: string,
  persona: string,
  userId: string | null,
): Promise<Feedback> {
  const e = env();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: e.TUTOR_MODEL,
      reasoning_effort: "low",
      response_format: { type: "json_schema", json_schema: FEEDBACK_JSON_SCHEMA },
      messages: [
        { role: "system", content: tutorSystemPrompt(level, persona) },
        { role: "user", content: tutorUserMessage(turns) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();

  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const usd = (usage.prompt_tokens * USD_PER_M_IN + usage.completion_tokens * USD_PER_M_OUT) / 1e6;
  await supabaseAdmin()
    .from("spend_ledger")
    .insert({ kind: "text", user_id: userId, usd: Math.max(0.0001, Number(usd.toFixed(4))) });

  return Feedback.parse(JSON.parse(data.choices[0].message.content));
}
