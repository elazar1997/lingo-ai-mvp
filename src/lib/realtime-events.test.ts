import { describe, expect, it } from "vitest";
import { avatarMood, initialCallState, reduceEvent, type CallState } from "./realtime-events";

function run(events: { type: string; [k: string]: unknown }[], from: CallState = initialCallState) {
  return events.reduce(reduceEvent, from);
}

describe("reduceEvent", () => {
  it("builds the transcript from user and assistant events", () => {
    const s = run([
      { type: "response.output_audio_transcript.delta", delta: "¡Hola! " },
      { type: "response.output_audio_transcript.done", item_id: "a1", transcript: "¡Hola! ¿Cómo estás?" },
      { type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "Muy bien" },
    ]);
    expect(s.turns).toEqual([
      { id: "a1", role: "assistant", text: "¡Hola! ¿Cómo estás?" },
      { id: "u1", role: "user", text: "Muy bien" },
    ]);
    expect(s.partial).toBe("");
  });

  it("accepts the beta event names", () => {
    const s = run([{ type: "response.audio_transcript.done", item_id: "a1", transcript: "Hola" }]);
    expect(s.turns[0].text).toBe("Hola");
  });

  it("ignores empty transcriptions", () => {
    const s = run([{ type: "conversation.item.input_audio_transcription.completed", item_id: "u1", transcript: "  " }]);
    expect(s.turns).toHaveLength(0);
  });

  it("sums usage across responses", () => {
    const usage = { output_token_details: { audio_tokens: 100 } };
    const s = run([
      { type: "response.done", response: { usage } },
      { type: "response.done", response: { usage } },
    ]);
    expect(s.usage.output_token_details?.audio_tokens).toBe(200);
  });

  it("tracks who is speaking", () => {
    const s = run([{ type: "input_audio_buffer.speech_started" }, { type: "output_audio_buffer.started" }]);
    expect(s.userSpeaking).toBe(true);
    expect(s.assistantSpeaking).toBe(true);
    expect(run([{ type: "output_audio_buffer.stopped" }], s).assistantSpeaking).toBe(false);
  });
});

describe("avatarMood", () => {
  it("laughs when the spoken line has a laugh", () => {
    expect(avatarMood({ ...initialCallState, assistantSpeaking: true, partial: "jajaja ¡qué chido!" })).toBe("laughing");
    expect(avatarMood({ ...initialCallState, assistantSpeaking: true, partial: "Bueno" })).toBe("speaking");
    expect(avatarMood(initialCallState)).toBe("idle");
  });
});
