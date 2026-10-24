// Realtime token prices in USD per 1M tokens. Source: OpenAI model page for
// gpt-realtime-2.1-mini (checked 2026-10-24). Update when switching models.
export const REALTIME_PRICES: Record<string, Prices> = {
  "gpt-realtime-2.1-mini": {
    textIn: 0.6,
    textCachedIn: 0.06,
    textOut: 2.4,
    audioIn: 10,
    audioCachedIn: 0.3,
    audioOut: 20,
  },
};

export type Prices = {
  textIn: number;
  textCachedIn: number;
  textOut: number;
  audioIn: number;
  audioCachedIn: number;
  audioOut: number;
};

// Shape of `usage` on a Realtime `response.done` event, summed over the session.
export type RealtimeUsage = {
  input_token_details?: {
    text_tokens?: number;
    audio_tokens?: number;
    cached_tokens_details?: { text_tokens?: number; audio_tokens?: number };
  };
  output_token_details?: { text_tokens?: number; audio_tokens?: number };
};

// Returns null for an unknown model so the caller keeps the conservative reservation.
export function realtimeCostUsd(model: string, usage: RealtimeUsage): number | null {
  const p = REALTIME_PRICES[model];
  if (!p) return null;
  const inp = usage.input_token_details ?? {};
  const cached = inp.cached_tokens_details ?? {};
  const out = usage.output_token_details ?? {};
  const cachedText = cached.text_tokens ?? 0;
  const cachedAudio = cached.audio_tokens ?? 0;
  const usd =
    (Math.max(0, (inp.text_tokens ?? 0) - cachedText) * p.textIn +
      cachedText * p.textCachedIn +
      Math.max(0, (inp.audio_tokens ?? 0) - cachedAudio) * p.audioIn +
      cachedAudio * p.audioCachedIn +
      (out.text_tokens ?? 0) * p.textOut +
      (out.audio_tokens ?? 0) * p.audioOut) /
    1_000_000;
  return Math.round(usd * 10_000) / 10_000;
}

export function addUsage(a: RealtimeUsage, b: RealtimeUsage): RealtimeUsage {
  const n = (x?: number, y?: number) => (x ?? 0) + (y ?? 0);
  return {
    input_token_details: {
      text_tokens: n(a.input_token_details?.text_tokens, b.input_token_details?.text_tokens),
      audio_tokens: n(a.input_token_details?.audio_tokens, b.input_token_details?.audio_tokens),
      cached_tokens_details: {
        text_tokens: n(
          a.input_token_details?.cached_tokens_details?.text_tokens,
          b.input_token_details?.cached_tokens_details?.text_tokens,
        ),
        audio_tokens: n(
          a.input_token_details?.cached_tokens_details?.audio_tokens,
          b.input_token_details?.cached_tokens_details?.audio_tokens,
        ),
      },
    },
    output_token_details: {
      text_tokens: n(a.output_token_details?.text_tokens, b.output_token_details?.text_tokens),
      audio_tokens: n(a.output_token_details?.audio_tokens, b.output_token_details?.audio_tokens),
    },
  };
}
