import { timingSafeEqual } from "node:crypto";
import { apiError, apiOk } from "@/lib/api";
import { env } from "@/lib/env";
import { isPersonaId, type PersonaId } from "@/lib/personas";
import { buildInstructions } from "@/lib/personas.server";
import { runScenario, SCENARIOS, type Complete } from "@/lib/persona-test";
import { supabaseAdmin } from "@/lib/supabase/server";

export const maxDuration = 120;

// Rough price of the test model per 1M tokens, for the spend ledger.
const USD_PER_M_IN = 0.25;
const USD_PER_M_OUT = 2;

// Internal: runs the scripted learners against the persona prompts and returns the
// transcripts. GET so it can be opened from a browser; guarded by PERSONA_TEST_KEY,
// and switched off entirely when that variable is not set.
export async function GET(request: Request) {
  const e = env();
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  if (!e.PERSONA_TEST_KEY || !safeEqual(key, e.PERSONA_TEST_KEY)) return apiError("FORBIDDEN");

  const personaParam = url.searchParams.get("persona");
  const personas: PersonaId[] = isPersonaId(personaParam) ? [personaParam] : ["lucia", "vale"];
  const scenarioParam = url.searchParams.get("scenario");
  const scenarios = scenarioParam ? SCENARIOS.filter((s) => s.id === scenarioParam) : SCENARIOS;
  if (scenarios.length === 0) return apiError("BAD_REQUEST");

  const complete: Complete = async (messages) => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: e.PERSONA_TEST_MODEL, messages, reasoning_effort: "minimal" }),
    });
    if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return { text: data.choices[0].message.content ?? "", usage: data.usage };
  };

  const jobs = personas.flatMap((persona) =>
    scenarios.map(async (scenario) => {
      const instructions = buildInstructions(persona, { level: "beginner", displayName: "Dana" });
      try {
        const { turns, usage } = await runScenario(instructions, scenario, complete);
        return { persona, scenario: scenario.id, turns, usage };
      } catch (err) {
        return { persona, scenario: scenario.id, error: String(err) };
      }
    }),
  );
  const results = await Promise.all(jobs);

  const usd = results.reduce(
    (sum, r) =>
      sum + ("usage" in r && r.usage ? (r.usage.prompt_tokens * USD_PER_M_IN + r.usage.completion_tokens * USD_PER_M_OUT) / 1e6 : 0),
    0,
  );
  await supabaseAdmin().from("spend_ledger").insert({ kind: "text", usd: Math.max(0.0001, Number(usd.toFixed(4))) });

  return apiOk({ model: e.PERSONA_TEST_MODEL, usd: Number(usd.toFixed(4)), results });
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
