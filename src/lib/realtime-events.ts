import { addUsage, type RealtimeUsage } from "@/lib/cost";

// Folds Realtime data-channel events into the state the call screen needs.
// Kept free of browser APIs so it can be unit tested.

export type Turn = { id: string; role: "user" | "assistant"; text: string };

export type CallState = {
  turns: Turn[];
  usage: RealtimeUsage;
  userSpeaking: boolean;
  assistantSpeaking: boolean;
  // Assistant text streamed so far for the response being spoken.
  partial: string;
};

export const initialCallState: CallState = {
  turns: [],
  usage: {},
  userSpeaking: false,
  assistantSpeaking: false,
  partial: "",
};

type RealtimeEvent = { type: string; [key: string]: unknown };

function upsertTurn(turns: Turn[], turn: Turn): Turn[] {
  const i = turns.findIndex((t) => t.id === turn.id);
  if (i === -1) return [...turns, turn];
  const next = turns.slice();
  next[i] = turn;
  return next;
}

export function reduceEvent(state: CallState, event: RealtimeEvent): CallState {
  switch (event.type) {
    case "input_audio_buffer.speech_started":
      return { ...state, userSpeaking: true };
    case "input_audio_buffer.speech_stopped":
      return { ...state, userSpeaking: false };

    case "output_audio_buffer.started":
      return { ...state, assistantSpeaking: true };
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return { ...state, assistantSpeaking: false };

    // The GA event names, with the beta names as a fallback.
    case "response.output_audio_transcript.delta":
    case "response.audio_transcript.delta":
      return { ...state, partial: state.partial + String(event.delta ?? "") };
    case "response.output_audio_transcript.done":
    case "response.audio_transcript.done": {
      const text = String(event.transcript ?? state.partial).trim();
      const id = String(event.item_id ?? `a-${state.turns.length}`);
      return { ...state, partial: "", turns: text ? upsertTurn(state.turns, { id, role: "assistant", text }) : state.turns };
    }

    case "conversation.item.input_audio_transcription.completed": {
      const text = String(event.transcript ?? "").trim();
      const id = String(event.item_id ?? `u-${state.turns.length}`);
      return text ? { ...state, turns: upsertTurn(state.turns, { id, role: "user", text }) } : state;
    }

    case "response.done": {
      const usage = (event.response as { usage?: RealtimeUsage } | undefined)?.usage;
      return usage ? { ...state, usage: addUsage(state.usage, usage) } : state;
    }

    default:
      return state;
  }
}

export type AvatarMood = "idle" | "speaking" | "laughing" | "thinking";

// Laughter shows when the persona's current line contains a laugh.
const LAUGH = /\b(ja){2,}|jaja|jeje|\[laugh/i;

export function avatarMood(state: CallState): AvatarMood {
  if (state.assistantSpeaking) return LAUGH.test(state.partial) ? "laughing" : "speaking";
  if (state.userSpeaking) return "idle";
  return "idle";
}
