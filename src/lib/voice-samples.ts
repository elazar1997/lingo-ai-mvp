import type { PersonaId } from "@/lib/personas";

// Candidate voices for each persona on the internal comparison page. The first one is
// the current choice in personas.server.ts.
export const VOICE_CANDIDATES: Record<PersonaId, string[]> = {
  lucia: ["marin", "sage", "shimmer"],
  vale: ["coral", "shimmer", "alloy"],
};

export function isCandidate(persona: PersonaId, voice: string): boolean {
  return VOICE_CANDIDATES[persona].includes(voice);
}
