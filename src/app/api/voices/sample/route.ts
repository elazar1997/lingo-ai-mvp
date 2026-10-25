import { z } from "zod";
import { apiError } from "@/lib/api";
import { env, isAdmin } from "@/lib/env";
import { isPersonaId } from "@/lib/personas";
import { voiceSample } from "@/lib/personas.server";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { isCandidate } from "@/lib/voice-samples";

const Body = z.object({ personaId: z.string().refine(isPersonaId), voice: z.string() });

// Rough cost of one ~10 second sample, booked so the monthly budget sees it.
const SAMPLE_USD = 0.005;

// Internal tool: speaks a persona's sample line in a candidate voice. Admins only.
export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return apiError("UNAUTHENTICATED");
  if (!isAdmin(user.email)) return apiError("FORBIDDEN");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPersonaId(parsed.data.personaId) || !isCandidate(parsed.data.personaId, parsed.data.voice)) {
    return apiError("BAD_REQUEST");
  }

  const e = env();
  const sample = voiceSample(parsed.data.personaId);
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: e.TTS_MODEL,
      voice: parsed.data.voice,
      input: sample.text,
      instructions: sample.style,
      response_format: "mp3",
    }),
  }).catch(() => null);

  if (!res?.ok) {
    const detail = res ? (await res.text().catch(() => "")).slice(0, 500) : "network error";
    console.error("voice sample failed", res?.status, detail);
    return apiError(res?.status === 429 ? "BUDGET_LIMIT" : "UPSTREAM_ERROR");
  }

  await supabaseAdmin().from("spend_ledger").insert({ user_id: user.id, kind: "text", usd: SAMPLE_USD });
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
