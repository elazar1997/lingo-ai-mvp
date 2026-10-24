// Public persona data, safe to send to the browser. Prompts live in personas.server.ts.
export type PersonaId = "lucia" | "vale";

export type Persona = {
  id: PersonaId;
  name: string;
  taglineHe: string;
  descriptionHe: string;
  accent: "purple" | "green";
};

export const PERSONAS: Record<PersonaId, Persona> = {
  lucia: {
    id: "lucia",
    name: "Lucía",
    taglineHe: "המורה הסבלנית",
    descriptionHe: "חמה, ברורה ומעודדת. מדברת ספרדית לטינית ניטרלית, ומסבירה בעברית כשנתקעים.",
    accent: "purple",
  },
  vale: {
    id: "vale",
    name: "Vale",
    taglineHe: "החברה מהעיר הגדולה",
    descriptionHe: "צעירה, מצחיקה ומלאת סלנג מקסיקני. מדברת כמו חברה, לא כמו ספר לימוד.",
    accent: "green",
  },
};

export function isPersonaId(value: unknown): value is PersonaId {
  return value === "lucia" || value === "vale";
}
