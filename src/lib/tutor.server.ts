import "server-only";
import { findLesson, type Lesson } from "@/content/path-es";
import { env } from "@/lib/env";
import { lessonBonusXp, lessonStars, wordsSaid } from "@/lib/mission";
import { isPersonaId, PERSONAS } from "@/lib/personas";
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  Feedback,
  feedbackJsonSchema,
  learnerSpoke,
  silentFeedback,
  toStored,
  tutorSystemPrompt,
  tutorUserMessage,
  type StoredFeedback,
  type TranscriptTurn,
} from "@/lib/tutor";

// Price of the tutor model per 1M tokens (input, output), for the spend ledger.
// Unknown models are booked at the gpt-5 price so the budget errs on the safe side.
const PRICES: Record<string, [number, number]> = { "gpt-5": [1.25, 10], "gpt-5-mini": [0.25, 2] };

// Analyzes a finished call and records its feedback, XP and streak day. Safe to call
// twice: record_feedback ignores a second write for the same session.
export async function runTutor(args: {
  userId: string;
  sessionId: string;
  turns: TranscriptTurn[];
}): Promise<void> {
  const admin = supabaseAdmin();
  const [{ data: session }, { data: profile }] = await Promise.all([
    admin.from("sessions").select("billed_seconds, persona_id, kind, lesson_id").eq("id", args.sessionId).maybeSingle(),
    admin.from("profiles").select("spanish_level").eq("id", args.userId).maybeSingle(),
  ]);
  const billed = session?.billed_seconds ?? 0;
  const lesson = session?.kind === "lesson" ? findLesson(session.lesson_id) : undefined;
  const placement = session?.kind === "placement";

  let stored: StoredFeedback;
  let result: Feedback | null = null;
  if (!learnerSpoke(args.turns)) {
    stored = silentFeedback(billed);
  } else {
    try {
      result = await analyze(
        args.turns,
        profile?.spanish_level ?? "beginner",
        isPersonaId(session?.persona_id) ? PERSONAS[session.persona_id].name : "Lucía",
        args.userId,
        { lesson, placement },
      );
      stored = toStored(result, billed);
    } catch (err) {
      console.error("tutor failed", String(err));
      return;
    }
  }

  // Lesson: count the target words in what the learner said, then stars and bonus XP
  // for stars beyond their best earlier attempt.
  if (lesson) {
    const { data: prev } = await admin
      .from("lesson_progress")
      .select("stars")
      .eq("user_id", args.userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle();
    const said = wordsSaid(lesson, args.turns.filter((t) => t.role === "user").map((t) => t.text));
    const goalMet = result?.goal_met ?? false;
    const stars = lessonStars(lesson, said.length, goalMet, stored.mistakes.length);
    const bonus = lessonBonusXp(stars, prev?.stars ?? 0);
    stored = {
      ...stored,
      xp: { ...stored.xp, lesson: bonus, total: stored.xp.total + bonus },
      lesson: { id: lesson.id, said, goal_met: goalMet, stars },
    };
  }
  if (placement && result?.placement_level) stored = { ...stored, placement: { level: result.placement_level } };

  // The level is set before the feedback appears, so the summary and path already use it.
  if (stored.placement) {
    await admin.from("profiles").update({ spanish_level: stored.placement.level }).eq("id", args.userId);
  }

  const { data: recorded, error } = await admin.rpc("record_feedback", {
    p_user: args.userId,
    p_session: args.sessionId,
    p_data: stored,
    p_xp: stored.xp.total,
  });
  if (error) return console.error("record_feedback failed", error.message);
  if (!recorded) return;

  if (stored.lesson) {
    const { error: lessonError } = await admin.rpc("record_lesson", {
      p_user: args.userId,
      p_session: args.sessionId,
      p_stars: stored.lesson.stars,
    });
    if (lessonError) console.error("record_lesson failed", lessonError.message);
  }
}

export async function analyze(
  turns: TranscriptTurn[],
  level: string,
  persona: string,
  userId: string | null,
  call: { lesson?: Lesson; placement?: boolean } = {},
): Promise<Feedback> {
  const e = env();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: e.TUTOR_MODEL,
      reasoning_effort: "low",
      response_format: {
        type: "json_schema",
        json_schema: feedbackJsonSchema({ mission: !!call.lesson, placement: call.placement }),
      },
      messages: [
        { role: "system", content: tutorSystemPrompt(level, persona, { mission: call.lesson?.mission, placement: call.placement }) },
        { role: "user", content: tutorUserMessage(turns) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();

  const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
  const [inPrice, outPrice] = PRICES[e.TUTOR_MODEL] ?? PRICES["gpt-5"];
  const usd = (usage.prompt_tokens * inPrice + usage.completion_tokens * outPrice) / 1e6;
  await supabaseAdmin()
    .from("spend_ledger")
    .insert({ kind: "text", user_id: userId, usd: Math.max(0.0001, Number(usd.toFixed(4))) });

  return Feedback.parse(JSON.parse(data.choices[0].message.content));
}
