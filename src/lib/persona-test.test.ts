import { describe, expect, it } from "vitest";
import { runScenario, SCENARIOS, TURNS, type Complete } from "./persona-test";

describe("runScenario", () => {
  it("alternates persona and learner, starting and ending with the persona", async () => {
    const seen: string[] = [];
    const complete: Complete = async (messages) => {
      seen.push(messages[0].content.startsWith("PERSONA") ? "persona" : "learner");
      return { text: `turn ${seen.length}`, usage: { prompt_tokens: 10, completion_tokens: 5 } };
    };
    const { turns, usage } = await runScenario("PERSONA prompt", SCENARIOS[0], complete);
    expect(turns).toHaveLength(TURNS * 2 - 1);
    expect(turns[0].role).toBe("persona");
    expect(turns.at(-1)?.role).toBe("persona");
    expect(usage.prompt_tokens).toBe(10 * turns.length);
  });

  it("shows each side the other's lines as the user", async () => {
    const calls: { role: string; content: string }[][] = [];
    const complete: Complete = async (messages) => {
      calls.push(messages);
      return { text: "x", usage: { prompt_tokens: 0, completion_tokens: 0 } };
    };
    await runScenario("PERSONA prompt", SCENARIOS[0], complete);
    // Second call is the learner: the persona's opening line arrives as "user".
    expect(calls[1][1].role).toBe("user");
    // Third call is the persona again: the learner's line arrives as "user".
    expect(calls[2].slice(1).map((m) => m.role)).toEqual(["assistant", "user"]);
  });
});
