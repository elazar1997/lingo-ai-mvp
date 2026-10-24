import { describe, expect, it } from "vitest";
import { addUsage, realtimeCostUsd } from "./cost";

describe("realtimeCostUsd", () => {
  it("prices one minute of mini audio each way", () => {
    // 600 input audio tokens and 1,200 output audio tokens.
    const usd = realtimeCostUsd("gpt-realtime-2.1-mini", {
      input_token_details: { audio_tokens: 600 },
      output_token_details: { audio_tokens: 1200 },
    });
    expect(usd).toBeCloseTo(0.006 + 0.024, 4);
  });

  it("bills cached tokens at the cached rate", () => {
    const usd = realtimeCostUsd("gpt-realtime-2.1-mini", {
      input_token_details: { audio_tokens: 1_000_000, cached_tokens_details: { audio_tokens: 1_000_000 } },
    });
    expect(usd).toBeCloseTo(0.3, 4);
  });

  it("returns null for an unpriced model", () => {
    expect(realtimeCostUsd("unknown-model", {})).toBeNull();
  });

  it("sums usage across responses", () => {
    const total = addUsage(
      { input_token_details: { text_tokens: 10 }, output_token_details: { audio_tokens: 5 } },
      { input_token_details: { text_tokens: 2 }, output_token_details: { audio_tokens: 1 } },
    );
    expect(total.input_token_details?.text_tokens).toBe(12);
    expect(total.output_token_details?.audio_tokens).toBe(6);
  });
});
